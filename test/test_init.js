'use strict';
const {init} = require("../index");
const expect = require("chai").expect;

describe("init()",function(){
  it("expect a Promise",function(){
    return init("some_data","bootstrap")
    .then((item)=>{
      expect(item).to.have.property("name","bootstrap");
      expect(item).to.have.property("data","some_data");
    })
  })

})
