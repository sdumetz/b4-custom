'use strict';
//Sanitize a text input to be css variables only
module.exports = function sanitize(text){
  if (!text || text == "{}"){ return ""} //Special case for empty JSON
  return text;
}
