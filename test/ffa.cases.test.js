var $ = require('interlude')
  , FFA = require(process.env.FFA_COV ? '../ffa-cov.js' : '../');

var getMaxLen = function (rnd) {
  return $.maximum($.pluck('length', $.pluck('p', rnd)));
};

// nice layout, 32 8 2 ensure it's right
exports.sizeEightGroups = function (t) {
  var opts = { sizes: [8, 8], advancers: [2] };
  t.equal(FFA.invalid(32, opts), null, "can construct 32 8 2 FFA");
  var ffa = new FFA(32, opts);

  var r1 = ffa.findMatches({r: 1})
    , r2 = ffa.findMatches({r: 2});

  t.equal(r1.length, 4, "4 full rounds gets all 32 players in r1");
  t.equal(getMaxLen(r1), 8, "4x8 in r1");

  t.equal(r2.length, 1, "4*2=8, proceeding => 1 groups of 8 in r2");
  t.equal(getMaxLen(r2), 8, "1x8 in r2");

  t.done();
};

// nice layout, 25 5 1 ensure it's right
exports.powersFive = function (t) {
  var opts = { sizes: [5, 5], advancers: [1] };
  t.equal(FFA.invalid(25, opts), null, "can construct 25 5 1 FFA");
  var ffa = new FFA(25, opts);

  var r1 = ffa.findMatches({r: 1})
    , r2 = ffa.findMatches({r: 2});

  t.equal(r1.length, 5, "5 full rounds gets all 25 players in r1");
  t.equal(getMaxLen(r1), 5, "5x5 in r1");

  t.equal(r2.length, 1, "5*1=5, proceeding => 1 groups of 5 in r2");
  t.equal(getMaxLen(r2), 5, "1x5 in r2");

  t.done();
};

// awful layout: 28 7 3
exports.uglySevensManual = function (t) {
  var opts = { sizes: [7, 6, 6], advancers: [3, 3] };
  t.equal(FFA.invalid(28, opts), null, "can construct 28 7 3 FFA");
  var ffa = new FFA(28, opts);

  var r1 = ffa.findMatches({r: 1})
    , r2 = ffa.findMatches({r: 2})
    , r3 = ffa.findMatches({r: 3});

  t.equal(r1.length, 4, "4 full rounds gets all 28 players in r1");
  t.equal(getMaxLen(r1), 7, "4x7 in r1");

  t.equal(r2.length, 2, "4*3=12, proceeding => 2 groups of 6 in r2");
  t.equal(getMaxLen(r2), 6, "2x6 in r2");

  t.equal(r3.length, 1, "2*3=6 proceeding => 1 group of 6 in r3");
  t.equal(getMaxLen(r3), 6, "1x6 in r3");

  t.done();
};

// will also work if you put [7, 7, 7] - group reduction is automatic
exports.uglySevensAutomatic = function (t) {
  var opts = { sizes: [7, 7, 7], advancers: [3, 3] };
  t.equal(FFA.invalid(28, opts), null, "can construct 28 7,7,7 3,3 FFA");
  // would work for [7,6,6] also
  opts.sizes = [7,6,6];
  t.equal(FFA.invalid(28, opts), null, "can construct 28 7,6,6 3,3 FFA");
  var ffa = new FFA(28, opts);

  var r1 = ffa.findMatches({r: 1})
    , r2 = ffa.findMatches({r: 2})
    , r3 = ffa.findMatches({r: 3});

  t.equal(r1.length, 4, "4 full rounds gets all 28 players in r1");
  t.equal(getMaxLen(r1), 7, "4x7 in r1");

  t.equal(r2.length, 2, "4*3=12, proceeding => 2 groups of 6 in r2");
  t.equal(getMaxLen(r2), 6, "2x6 in r2");

  t.equal(r3.length, 1, "2*3=6 proceeding => 1 group of 6 in r3");
  t.equal(getMaxLen(r3), 6, "1x6 in r3");

  t.done();
};

// difficult layout: 36 6 3 - reduce advancers for final
exports.nonStandardSixes = function (t) {
  var opts = { sizes: [6, 6, 6], advancers: [3, 2] };
  t.equal(FFA.invalid(36, opts), null, "can construct 32 6,6,6 3,2 FFA");
  var ffa = new FFA(36, opts);

  var r1 = ffa.findMatches({r: 1})
    , r2 = ffa.findMatches({r: 2})
    , r3 = ffa.findMatches({r: 3});

  t.equal(r1.length, 6, "6 full rounds gets all 36 players in r1");
  t.equal(getMaxLen(r1), 6, "6x6 in r1");

  t.equal(r2.length, 3, "3*6=18, proceeding => 3 groups of 6 in r2");
  t.equal(getMaxLen(r2), 6, "3x6 in r2");

  t.equal(r3.length, 1, "3*2=6 proceeding => 1 group of 6 in r3");
  t.equal(getMaxLen(r3), 6, "1x6 in r3");

  t.done();
};

// difficult layout: 49 7 3 - reduces advancers for final
exports.nonStandardSevens = function (t) {
  var opts = { sizes: [7, 7, 6], advancers: [3,2] };
  t.equal(FFA.invalid(49, opts), null, "can construct 49 7,7,6 3,2 FFA");
  var ffa = new FFA(49, opts);

  var r1 = ffa.findMatches({r: 1})
    , r2 = ffa.findMatches({r: 2})
    , r3 = ffa.findMatches({r: 3});

  t.equal(r1.length, 7, "7 full rounds gets all 49 players in r1");
  t.equal(getMaxLen(r1), 7, "7x7 in r1");

  t.equal(r2.length, 3, "3*7=21, proceeding => 3 groups of 7 in r2");
  t.equal(getMaxLen(r2), 7, "3x7 in r2");

  t.equal(r3.length, 1, "3*2=6 proceeding => 1 group of 6 in r3");
  t.equal(getMaxLen(r3), 6, "1x6 in r3");

  t.done();
};

// really dragged out 16p were we only kill one from each group
exports.advanceAlmostEveryone = function (t) {
  var opts = { sizes: [4,4,3,3,4], advancers: [3,3,2,2] };
  t.equal(FFA.invalid(16, opts), null, "can FFA 16 4 3");
  var ffa = new FFA(16, opts);

  var r1 = ffa.findMatches({r: 1})
    , r2 = ffa.findMatches({r: 2})
    , r3 = ffa.findMatches({r: 3})
    , r4 = ffa.findMatches({r: 4})
    , r5 = ffa.findMatches({r: 5});

  t.equal(r1.length, 4, "4 rounds gets all 16 players in r1");
  t.equal(getMaxLen(r1), 4, "4x4 in r1");

  t.equal(r2.length, 3, "4*3=12, 3 groups of 4 proceeding");
  t.equal(getMaxLen(r2), 4, "3x4 in r2");

  t.equal(r3.length, 3, "3*3=9, 3 groups of 3 proceeding");
  t.equal(getMaxLen(r3), 3, "3x3 in r3");

  t.equal(r4.length, 2, "2*3=6, 2 groups of 3 proceeding");
  t.equal(getMaxLen(r4), 3, "2x3 in r4");

  t.equal(r5.length, 1, "1*4=4, 1 group of 4 proceeding");
  t.equal(getMaxLen(r5), 4, "1x4 in r5");

  t.done();
};
