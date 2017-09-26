'use strict';
const path = require("path");
const fs = require('fs');
//Archive creation tool
const archiver = require('archiver');
// SASS compilation
const sass = require('node-sass');

//auto prefixing
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');

//minify tool
const CleanCSS = require('clean-css');
const postcss_config = require("bootstrap/build/postcss.config.js");
const b_path = path.join(__dirname, "node_modules/bootstrap");

const sanitize = require("./lib/sanitize");


/* node-sass --output-style expanded --source-map true --source-map-contents true --precision 6 scss/bootstrap.scss dist/css/bootstrap.css && node-sass --output-style expanded --source-map true --source-map-contents true --precision 6 scss/bootstrap-grid.scss dist/css/bootstrap-grid.css && node-sass --output-style expanded --source-map true --source-map-contents true --precision 6 scss/bootstrap-reboot.scss dist/css/bootstrap-reboot.css
*/
const sass_config = {
  outputStyle: "expanded",
  precision: 6,
  sourceMap: true,
  sourceMapContents: true,
}

/* cleancss --level 1 --source-map --source-map-inline-sources --output dist/css/bootstrap.min.css dist/css/bootstrap.css && cleancss --level 1 --source-map --source-map-inline-sources --output dist/css/bootstrap-grid.min.css dist/css/bootstrap-grid.css && cleancss --level 1 --source-map --source-map-inline-sources --output dist/css/bootstrap-reboot.min.css dist/css/bootstrap-reboot.css
*/
const cleancss_options = {
  returnPromise: true,
  level: 1,
  sourceMap: true,
  sourceMapInlineSources: true
}

const tmpfile = `/tmp/out.tar.gz`;

function do_finalize(items){
  return new Promise(function(resolve,reject){
    let errored = false;
    let output = fs.createWriteStream(tmpfile);
    let archive = archiver('tar', {
      gzip: true,
      gzipOptions: {
        level: 1
      }
    });
    archive.once("error",(e)=>{errored = true; reject(e)});
    archive.on('warning', (err)=> {reject(err); });
    archive.on("end",function(){
      console.log("close");
      if (!errored){
        resolve();
      }
    });
    // pipe archive data to the file
    archive.pipe(output);
    //Append files contents
    items.forEach(function(item){
      if ( ! item.isValid){
        return console.log("Invalid item : css: %s, map: %s, mincss: %s",
          typeof item.css,
          typeof item.map,
          typeof item.mincss
        );
      }
      archive = archive.append(item.css, {name: item.cssPath})
      .append(item.mincss, {name: item.minPath})
      .append(item.map, {name: item.mapPath});
    });
    console.log("finalize")
    archive.finalize();
  });
}

class Item{
  constructor(data, name){
    this._custom_data = data;
    this._name = name;
    this.meta = {};
  }
  /* in addition, handlers will add the css,mincss and map attributes */
  get name(){   return this._name; }
  get data(){return this._custom_data}
  get inputDir(){
    return path.join(b_path,"scss");
  }
  get outputDir(){ //relative path
    return "dist/css";
  }
  get inputPath(){
    return path.join(this.inputDir,this.name+".scss");
  }

  get cssPath(){
    return path.join(this.outputDir,this.name+".css");
  }
  get mapPath(){
    return path.join(this.outputDir,this.name+".map");
  }
  get minPath(){
    return path.join(this.outputDir,this.name+".min.css");
  }
  get isValid(){
    return typeof this.css == "string"
    && typeof this.map == "string"
    && typeof this.mincss == "string" ;
  }
}



function do_sass(state) {
  let conf = Object.assign({},sass_config,{
    data: `${state.data}\n@import "${state.inputPath}";`,
    includePaths: [state.inputDir],
    outFile: state.cssPath
  });
  return new Promise(function(resolve,reject){
    sass.render(conf,function(err,sass_res){
      if (err ){return reject(err)}
      resolve(Object.assign(state,{
        map:JSON.parse(sass_res.map.toString('utf8')),
        css:sass_res.css.toString('utf8'),
        meta: Object.assign(state.meta,{sass:sass_res.stats})
      }));
    });
  })
}

function do_postcss(state){
  //console.log("postcss");
  //console.log(state.map)
  return postcss([autoprefixer])
  .process(state.css, {
    from: state.inputPath,
    to: state.cssPath,
    map:{
      inline:false,
      prev: state.map
    }
  })
  .then((prefixed)=>{
    return Object.assign(state,{
      css:prefixed.css,
      map: JSON.parse(prefixed.map.toString())
    });
  });
}

function do_cleancss(state){
  //console.log("cleancss");
  return new CleanCSS(cleancss_options)
  .minify(state.css,state.map)
  .then(function(out){
    return Object.assign(state,{
      mincss:out.styles,
      map:JSON.stringify(out.sourceMap),
      meta: Object.assign(state.meta,{cleancss:{
        warnings: out.warnings,
        stats: out.stats
      }})
    });
  });
}

function init(custom_data, filename){
  return Promise.resolve(new Item(custom_data, filename))
}

function compile(data){
  let dataInit = init.bind(this,data);
  return Promise.all(
   ["bootstrap", "bootstrap-reboot", "bootstrap-grid"]
   .map(
     name => dataInit(name)
     .then(do_sass)
     .then(do_postcss)
     .then(do_cleancss)
   )
 )
}

function handler(event, context, callback){
  console.log("event : ",event);
  let custom_data = "";
  if (event.bodyData){ //for pre-parsed bodies, like JSON
    custom_data = event.bodyData
  } else if (event.base64Data){
    custom_data = Buffer.from(event.base64Data, "base64").toString("utf8")
  }else if( event.formData){
    custom_data ="";
  }
  console.log(custom_data);
  if (4096 < custom_data.length){
    return callback(new Error("Custom data over size limit of 4kB"));
  }
  custom_data = sanitize(custom_data);
  console.log("Build with data : ",custom_data);
  //TODO : compile input with node-sass to really sanitize

  compile(custom_data)
  .then(do_finalize)
  .then(function(){
    let data = fs.readFileSync(tmpfile);
    //fs.unlinkSync(tmpfile);
    callback(null,data.toString("base64"));
  }).catch(function(e){
    console.log(e);
    callback(new Error("Processing Error : "+e.message));
  })
};
module.exports = {
  init: init,
  compile: compile,
  handler: handler
}
