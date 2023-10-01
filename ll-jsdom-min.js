#!/usr/bin/env node

const { JSDOM } = require("jsdom");

(async ()=>{
  const dom = await JSDOM.fromURL(process.argv[2]);
  [].slice.call(dom.window.document.getElementsByTagName("a")).forEach(e=>(e.href)&&console.log(e.href));
})()
