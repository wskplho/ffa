var $ = require('interlude')
  , group = require('group')
  , Base = require('tournament');

var isInteger = function (n) { // will be on Number in ES6
  return Math.ceil(n) === n;
};

var roundInvalid = function (np, grs, adv, numGroups) {
  // the group size in here refers to the maximal reduced group size
  if (np < 2) {
    return "needs at least 2 players";
  }
  if (grs < 3 || (numGroups === 1 && grs >= 2)) {
    return "groups size must be at least 3 in regular rounds - 2 in final";
  }
  if (grs >= np) {
    return "group size must be less than the number of players left";
  }
  if (adv >= grs) {
    return "must advance less than the group size";
  }
  var isUnfilled = (np % numGroups) > 0;
  if (isUnfilled && adv >= grs - 1) {
    return "must advance less than the smallest match size";
  }
  if (adv <= 0) {
    return "must eliminate players each match";
  }
  return null;
};

var finalInvalid = function (leftOver, limit, gLast) {
  if (leftOver < 2) {
    return "must at least contain 2 players"; // force >4 when using limits
  }
  var lastNg = Math.ceil(leftOver / gLast);
  if (limit > 0) { // using limits
    if (limit >= leftOver) {
      return "limit must be less than the remaining number of players";
    }
    // need limit to be a multiple of numGroups (otherwise tiebreaks necessary)
    if (limit % lastNg !== 0) {
      return "number of groups must divide limit";
    }
  }
  else if (lastNg !== 1) {
    return "must contain a single match when not using limits";
  }
  return null;
};

var invalid = function (np, grs, adv, opts) {
  opts = opts || {};
  if (!isInteger(np) || np < 2) {
    return "number of players must be at least 2";
  }
  if (!Array.isArray(grs) || !Array.isArray(adv)) {
    return "adv and grs must be arrays";
  }
  if (!grs.length || !grs.every(isInteger)) {
    return "grs must be a non-empty array of integers";
  }
  if (!adv.every(isInteger) || grs.length !== adv.length + 1) {
    return "adv must be an array of integers of length grs.length - 1";
  }

  var numGroups = 0;
  for (var i = 0; i < adv.length; i += 1) {
    // loop over adv as then both a and g exist
    var a = adv[i];
    var g = grs[i];
    // calculate how big the groups are
    numGroups = Math.ceil(np / g);
    var gActual = group.minimalGroupSize(np, g);

    // and ensure with group reduction that eliminationValid for reduced params
    var invReason = roundInvalid(np, gActual, a, numGroups);
    if (invReason !== null) {
      return "round " + (i+1) + " " + invReason;
    }
    // return how many players left so that np is updated for next itr
    np = numGroups*a;
  }
  // last round and limit checks
  var invFinReason = finalInvalid(np, opts.limit | 0, grs[grs.length-1]);
  if (invFinReason !== null) {
    return "final round: " + invFinReason;
  }

  // nothing found - ok to create
  return null;
};

var unspecify = function (grps) {
  return grps.map(function (grp) {
    return $.replicate(grp.length, Base.NONE);
  });
};

var elimination = function (np, grs, adv) {
  var matches = []; // pushed in sort order
  // rounds created iteratively - know configuration valid at this point so just
  // repeat the calculation in the validation
  for (var i = 0; i < grs.length; i += 1) {
    var a = adv[i]
      , gs = grs[i]
      , numGroups = Math.ceil(np / gs)
      , grps = group(np, gs);

    if (numGroups !== grps.length) {
      throw new Error("internal FFA construction error");
    }
    if (i > 0) {
      // only fill in seeding numbers for round 1, otherwise placeholders
      grps = unspecify(grps);
    }

    // fill in matches
    for (var m = 0; m < grps.length; m += 1) {
      matches.push({id: {s: 1, r: i+1, m: m + 1}, p: grps[m]}); // matches 1-indexed
    }
    // reduce players left (for next round - which will exist if a is defined)
    np = numGroups*a;
  }
  return matches;
};

var prepRound = function (currRnd, nxtRnd, adv) {
  var top = currRnd.map(function (m) {
    return $.zip(m.p, m.m).sort(Base.compareZip).slice(0, adv);
  });

  // now flatten and sort across matches
  // this essentially re-seeds players for the next round
  top = $.pluck(0, $.flatten(top).sort(Base.compareZip));

  // re-find group size from maximum length of zeroed player array in next round
  var grs = $.maximum($.pluck('length', $.pluck('p', nxtRnd)));

  // set all next round players with the fairly grouped set
  group(top.length, grs).forEach(function (group, k) {
    // replaced nulled out player array with seeds mapped to corr. top placers
    nxtRnd[k].p = group.map(function (seed) {
      return top[seed-1]; // NB: top is zero indexed
    });
  });
};


// interface
var FFA = Base.sub('FFA', ['numPlayers', 'grs', 'advs', 'opts'], {
  init: function (initParent) {
    this.version = 1;
    this.limit = this.opts ? this.opts.limit | 0 : 0;
    // TODO: grs do not seem to actually be reduced in `this` atm
    initParent(elimination(this.numPlayers, this.grs, this.advs));
    delete this.opts;
    delete this.grs;
  },
  progress: function (match) {
    var adv = this.advs[match.id.r - 1] || 0;
    var currRnd = this.findMatches({r: match.id.r});
    if (currRnd.every($.get('m')) && adv > 0) {
      prepRound(currRnd, this.findMatches({r: match.id.r + 1}), adv);
    }
  },
  verify: function (match, score) {
    console.log('got match for verify:', match, score);
    var adv = this.advs[match.id.r - 1] || 0;
    if (adv > 0 && score[adv] === score[adv - 1]) {
      return "scores must unambiguous decide who advances";
    }
    if (!adv && this.limit > 0) {
      // number of groups in last round is the match number of the very last match
      // because of the ordering this always works!
      var lastNG = this.matches[this.matches.length-1].id.m;
      var cutoff = this.limit/lastNG; // NB: lastNG divides limit (from finalInvalid)
      if (score[cutoff] === score[cutoff - 1]) {
        return "scores must decide who advances in final round with limits";
      }
    }
    return null;
  },
  limbo: function (playerId) {
    // if player reached currentRound, he may be waiting for generation of nextRound
    var m = $.firstBy(function (m) {
      return m.p.indexOf(playerId) >= 0 && m.m;
    }, this.currentRound() || []);

    if (m) {
      // will he advance to nextRound ?
      var adv = this.advs[m.id.r - 1];
      if (Base.sorted(m).slice(0, adv).indexOf(playerId) >= 0) {
        return {s: 1, r: m.id.r + 1};
      }
    }
  }
});

FFA.invalid = invalid;
FFA.idString = function (id) {
  // ffa has no concepts of sections yet so they're all 1
  if (!id.m) {
    return "R" + id.r + " M X";
  }
  return "R" + id.r + " M" + id.m;
};

// helpers for results' round loop
var isReady = function (rnd) {
  return rnd.some(function (m) {
    return m.p.some($.neq(Base.NONE));
  });
};
var isDone = function (rnd) {
  return rnd.every($.get('m'));
};

// TODO: best scores
FFA.prototype.stats = function (res) {
  var advs = this.advs;
  var maxround = 1;
  for (var i = 0; i < this.matches.length; i += 1) {
    var g = this.matches[i];
    maxround = Math.max(g.id.r, maxround);

    if (g.m) {
      // count stats for played matches
      var top = $.zip(g.p, g.m).sort(Base.compareZip);
      for (var j = 0; j < top.length; j += 1) {
        var pJ = top[j][0] - 1  // convert seed -> zero indexed player number
          , mJ = top[j][1];     // map wins for pJ

        var adv = advs[g.id.r - 1] || 0;
        // NB: final round win counted by .positionTies as can have multiple winners
        if (j < adv) {
          res[pJ].wins += 1;
        }
        res[pJ].for += mJ;
        //res[pJ].against += (top[0][1] - mJ); // difference with winner
      }
    }
  }

  var limit = this.limit;
  // gradually improve scores for each player by looking at later and later rounds
  this.rounds().forEach(function (rnd, k) {
    var adv = advs[k] || 0; // so we can do last round
    var rndPs = $.flatten($.pluck('p', rnd));

    if (isDone(rnd)) {
      if (limit > 0 && k === maxround - 1) {
        // this is the special case of a `limit`ed tournament
        // it may not be a 'final' in the sense that rnd.length >= 1
        // as the winnners goto a new tournament and losers are knocked out

        if (rndPs.length < limit) {
          // sanity check for own tests
          throw new Error("FFA internal error - too few players for forwarding");
        }
        // figure out how many to advance from each round
        // we know limit is a multiple of rnd.length
        if (limit % rnd.length !== 0) {
          throw new Error("FFA internal error - limit not multiple of maxrnd len");
        }
        adv = limit / rnd.length;

        // losers fall through and are scored as any other done round with 'adv' set
        // but we must positions winners as well (top adv each match) in this rnd
        // as nothing else does this in this special case
        rnd.forEach(function (m) {
          // loop through winners
          Base.sorted(m).slice(0, adv).forEach(function (w, i) {
            var resEl = res[w - 1];
            // no adv set for this round so must also increment wins for these
            resEl.wins += 1;
            // their final position shall be tied between groups, and desc within
            resEl.pos = i*rnd.length + 1;
          });
        });
      }
      // if round is done, position the ones not advancing from that round
      // collect and sort between round the ones after top adv
      // NB: in `limit`-less final, adv is zero, so everyone's treated as a loser
      rnd.forEach(function (m) {
        // start at: numPlayers - (numPlayers - adv*numGroups) + 1
        var start = rndPs.length - (rndPs.length - adv*rnd.length) + 1;

        // loop through losers
        Base.sorted(m).slice(adv).forEach(function (l, i) {
          var resEl = res[l - 1];
          if (i === 0 && adv === 0) {
            // set wins +1 on actual winner in `limit`-less final
            resEl.wins += 1;
          }
          // tie x-placing losers between groups (at least pos-wise)
          resEl.pos = start + i*rnd.length;
        });
      });
    }
    else if (isReady(rnd)) {
      // round is simply ready, make sure everyone who got here is tied
      rndPs.forEach(function (p) {
        // last place in round is simply number of players beneath
        res[p-1].pos = rndPs.length;
      });
    }
  });
  // still sort also by maps for in case people want to use that
  return res.sort($.comparing('pos', +1, 'for', -1));
};


module.exports = FFA;
