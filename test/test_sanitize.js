'use strict';
const sanitize = require("../lib/sanitize");
const expect = require("chai").expect;

describe("sanitize()",function(){
  [
    ["{}", "", "filter out empty JSON object"],
    [null, "", "filter null object"],
  ].forEach(function(f, idx){
    it(f[2]||`fixture N°${idx}`,function(){
      expect(sanitize(f[0])).to.equal(f[1]);
    })
  })

})
