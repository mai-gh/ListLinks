# ListLinks

## Task:

> 1. Make a nodejs program that downloads a web page (any web page will do) and give a list of links on the page (any tags).

> 2.  Please cite your sources and process for solving the test.

---

## Initial Thoughts:

- This sounds a lot like a tool I have used a lot in the past:

> `$ lynx --dump --listonly --nonumbers --hiddenlinks=merge https://wikipedia.org`

- My first thought is I should only be targeting `<a href="...">` tags / attributes, but let's find some sources that define what a link is:
    - [https://www.w3.org/TR/html401/struct/links.html#h-12.1](https://www.w3.org/TR/html401/struct/links.html#h-12.1) states:

        > A link has two ends -- called anchors -- and a direction. The link starts at the "source" anchor and points to the "destination" anchor, which may be any Web resource (e.g., an image, a video clip, a sound bite, a program, an HTML document, an element within an HTML document, etc.).

    - So by this definition: a "link" must contain an anchor! A URI used in anyway without an anchor is not a link!
    - [https://www.w3.org/TR/html401/struct/links.html#h-12.1.3](https://www.w3.org/TR/html401/struct/links.html#h-12.1.3) states:

        > The LINK element may only appear in the head of a document. The A element may only appear in the body.

- I will make two variants:
    1. With the [jsdom](https://github.com/jsdom/jsdom) library.
    2. Vanilla JS using regular expressions & string / array manipulations . 

- I am using version `20.8.0` of `node`

---

## Development Process:

### Starting Out:

  - When I develop "web scraper" type programs, I prefer to used static data because:
    1. it doesn't change.
    2. it prevents unnecessary network calls.
  - I would normally do this with `$ curl https://wikipedia.org > wikipedia.html`. 
  - Since we will need to perform http requests later, but we want to read a file now, let's build both into our tool.
  - Here is how I imagine invoking this tool:
    - `$ ./ll.js --save-file wikipedia.org.html https://wikipedia.org`
    - `$ ./ll.js --from-file wikipedia.org.html https://wikipedia.org`
    - `$ ./ll.js https://en.wikipedia.org/wiki/Special:Random`
  - I will start by building out the argument parsing with [`node:util.parseArgs`](https://nodejs.org/api/util.html#utilparseargsconfig)
  - Then I will build the logic of saving / loading a file using the [fs.promises](https://nodejs.org/api/fs.html#promises-api), combined with [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch).

### JSDOM version:

  - I will install jsdom and follow their docs to allow use of queryselectors to find all anchors, and then print the href value of each anchor if it exists.

  - jsdom makes this task easy work. This entire project could scrunched into a hard to read, but super compact oneliner:

  >  ```bash
  >  npm ls jsdom >/dev/null || npm install jsdom && node -e "const {JSDOM}=require('jsdom');JSDOM.fromURL(process.argv[1]).then(dom=>[].slice.call(dom.window.document.getElementsByTagName('a')).forEach(e=>(e.href)&&console.log(e.href)));" https://wikipedia.org
  >  ```

  - a simplified and easier to read version of this is saved in [./ll-jsdom-min.js](./ll-jsdom-min.js)

### Vanilla JS Version:

  - Since nodejs doesn't provide a XML or HTML parser out of the box, we are going to have to write our own.
  - It is very common for html to have syntax errors that are uncorrected, we will have to account for this.
  - We will also need to account for HTML comments `<!-- -->` and `<style>` / `<script>` blocks.
  - We can avoid dealing with C style comments in JS & CSS by just removing these elements entirely.
  - Starting out, we want to remove all commented `<script>` & `<style>` blocks, then all html comments.
  - Next we make an array of every section between `<a ... </a>`.
  - Then we retrieve the value for the `href` attribute.
  - Then we do little fixups that the dom would otherwise handle for us.
  - [Take a look at the code for more details](./ll.js?plain=1#L104)

### Caveats:

  - Both approaches are not fool-proof. Modern web browsers do all types of gymnastics to deal with illegally formatted code. Without going crazy over a potentially endless amout of edge cases, there will always be bugs.
  - Not all html character encodings are handled. [List of character entity references in HTML](https://en.wikipedia.org/wiki/List_of_XML_and_HTML_character_entity_references#Character_entity_references_in_HTML)
  - Redirects: `fetch` seems to generaly handle these ok, but when I tried `./ll.js https://aliexpress.com` it complains about ` redirect count exceeded`.
  - Dynamically generated DOM elements: I made no attempt to try to support this. jsdom has an option to run  client side scripts, [but even they say it's dangerous](https://github.com/jsdom/jsdom#executing-scripts).
  - I didn't write any unit tests. Mostly because test coverage on this is about as huge as mapping all edge cases.

---

## Usage:

```bash

git clone https://github.com/mai-gh/ListLinks.git
cd ListLinks
./ll.js --help
./ll.js https://wikipedia.com
npm install
./ll.js --mode jsdom https://wikipedia.com

```
