'use strict';
const {compile} = require("../index");
const expect    = require("chai").expect;


describe("compile()",function(){
  it("compare size",function(){
    return compile("")
    .then(function(items){
      expect(Array.isArray(items)).to.be.true;
      items.forEach(function(item){
        expect(item.css).to.have.property("length").above(1000);
      });
    });
  });
});
