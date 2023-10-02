#!/usr/bin/env node

const { JSDOM } = require("jsdom");

(async () => {

  const dom = await JSDOM.fromURL(process.argv[2]);
  const anchorArray = [].slice.call(dom.window.document.getElementsByTagName("a"));
  const found = anchorArray.map((e) => {
    if (e.href) return e.href;
  });

  console.log(found.join("\r\n"));

})();
