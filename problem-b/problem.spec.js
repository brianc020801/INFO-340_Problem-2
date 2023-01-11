const fs = require('fs');
const cheerio = require('cheerio') //for html testing
const inlineCss = require('inline-css'); //for css testing
const cssParser = require('css');

//include custom matchers
const styleMatchers = require('jest-style-matchers');
expect.extend(styleMatchers);

const htmlPath = __dirname + '/index.html';
const html = fs.readFileSync(htmlPath, 'utf-8'); //load the HTML file once
const cssPath = __dirname + '/css/style.css';
const css = fs.readFileSync(cssPath, 'utf-8'); //load the HTML file once

//absolute path for relative loading (if needed)
const baseDir = 'file://'+__dirname+'/';

describe('Source code is valid', () => {
  test('HTML validates without errors', async () => {
    const lintOpts = {
      'attr-bans':['align', 'background', 'bgcolor', 'border', 'frameborder', 'marginwidth', 'marginheight', 'scrolling', 'style', 'width', 'height'], //adding height, allow longdesc
      'doctype-first':true,
      'doctype-html5':true,
      'html-req-lang':true,
      'attr-name-style': false, //for meta tags
      'line-end-style':false, //either way
      'indent-style':false, //can mix/match
      'indent-width':false, //don't need to beautify
      'line-no-trailing-whitespace': false, //don't need to beautify
      'class-style':'none', //I like dashes in classnames
      'img-req-alt':true,
      'link-req-noopener':false,
      'spec-char-escape':false //for params in link urls
    }

    await expect(htmlPath).toHaveNoHtmlLintErrorsAsync(lintOpts);
  })

  test('CSS validates without errors', async () => {
    await expect(cssPath).toHaveNoCssLintErrorsAsync();
  })
});

let $; //cheerio instance
let cssRules;  

beforeAll(async () => {
  //test CSS by inlining properties and then reading them from cheerio
  let inlined = await inlineCss(html, {extraCss: css, url:baseDir, removeLinkTags:false});
  $ = cheerio.load(inlined);
  // console.log(inlined);

  //non-inlined rules by parsing AST tree
  let cssAST = cssParser.parse(css, {source: cssPath});
  cssRules = cssAST.stylesheet.rules.filter((d) => d.type === "rule");
  // console.log(cssRules)
})

describe('The top-level heading', () => {
  test('is present with correct content', () => {
    let h1 = $('h1');
    expect(h1).toHaveLength(1); //has one <h1>
    expect(h1.text().trim()).toMatch(/^Top 5 Songs For/); //starts with correct label
  })

  test('has correct styling', () => {
    let h1 = $('h1');
    expect(h1.css('font-weight')).toEqual('300');
    let fontFamilySingleQuotes = (h1.css('font-family')).replace(/"/g, '\'');
    expect(fontFamilySingleQuotes).toMatch(/'?Roboto'?, *sans-serif/);
    expect(h1.css('text-align')).toEqual('center');
  })
})

describe('The overall table', () => {
  test('is present', () => {
    expect($('table')).toHaveLength(1); //has 1 table element
  })

  test('takes up half the page', () => {
    let table = $('table');
    expect(table.css('width')).toEqual("50%");
    expect(table.css('margin-left')).toEqual("auto");
    expect(table.css('margin-right')).toEqual("auto");
  })
})

describe('The table header', () => {
  test('includes a head section', () => {
    let thead = $('table').children('thead');
    expect(thead).toHaveLength(1); //includes 1 thead
  })

  test('includes a row of header cells', () => {
    let row = $('table > thead').children('tr');
    expect(row).toHaveLength(1); //one header row
    let headCells = row.children('th');
    expect(headCells).toHaveLength(4); //has 4 <th> cells

    let cellContentsNoSpaces = headCells.text().replace(/\s/,'');
    expect(cellContentsNoSpaces).toEqual('RankArtistTitleAlbum');
  })

  test('has correct styling', () => {
    let headCells = $('table > thead > tr > th');
    headCells.each((i, el) => {
      let cell = $(el);
      expect(cell.css('height')).toEqual('2rem');
      expect(cell.css('text-align')).toEqual('left');
      expect(cell.css('color').toLowerCase()).toEqual('#1db954');
      expect(cell.css('background-color').toLowerCase()).toEqual('#d3d3d3');
    })

    let table = $('table');
    expect(table.css('border-collapse')).toEqual('collapse'); //check table border
  })
})

describe('The table body', () => {
  test('includes a body section', () => {
    let tbody = $('table').children('tbody');
    expect(tbody).toHaveLength(1); //includes 1 tbody
  })

  test('includes required rows of data', () => {
    let rows = $('table > tbody').children('tr');
    expect(rows).toHaveLength(5); //body contains 5 rows

    rows.each((i, el) => {
      let row = $(el);
      let cells = row.children('td');
      expect(cells).toHaveLength(4); //each row has 4 cells

      expect(cells.first().text().trim()).toEqual(String(i+1)); //rows numbered 1-5

      cells.each((i, el) => {
        expect($(el).html()).not.toEqual(''); //each cell has content
      })
    })
  })

  test('has album covers that link elsewhere', () => {
    let lastCells = $('table > tbody > tr > td:last-child');

    lastCells.each((i, el) => {
      let lastCell = $(el);
      let anchor = lastCell.children('a');
      expect(anchor).toHaveLength(1); //each cell contains an anchor element
      expect(anchor.children('img')).toHaveLength(1); //each anchor contains img

      expect(anchor.attr('target')).toEqual('_blank'); //links open in new tabs
    })
  })
  
  test('has album covers with appropriate sizing', () => {
    let lastCells = $('table > tbody > tr > td:last-child');

    lastCells.each((i, el) => {
      let img = $(el).find('img');
      expect(img.css('width')).toEqual('100px'); //image has correct size
      expect(img.css('height')).toEqual('100px'); //image has correct size
    })
  })
})

describe('Table cell styling', () => {
  test('is appropriate for all cells', () => {
    let allCells = $('th, td');
    allCells.each((i, el) => {
      let cell = $(el);
      expect(cell.css('padding')).toMatch(/^0?.5em/);
      expect(cell.css('border-bottom')).toEqual('1px solid #d3d3d3');
    })
  })
})

describe('Table row styling', () => {
  test('alternates gray backgrounds for rows', () => {
    let rows = $('table > tbody > tr');
    rows.each((i, el) => {
      if((i+1)%2 === 0) { //even rows
        let evenRow = $(el);
        expect(evenRow.css('background-color')).toEqual('#eee');
      } else {
        let oddRow = $(el);
        expect(oddRow.css('background-color')).not.toBeDefined();
      }
    })

    let pseudoChildRules = cssRules.filter((r) => r.selectors.join().includes(':nth-'));
    expect(pseudoChildRules).toHaveLength(1); //uses a pseudo-class to color rows
  })

  test('highlights rows on hover', () => {
    let hoverRules = cssRules.filter((r) => r.selectors.join().match(/tbody.*tr.*:hover/));
    expect(hoverRules).toHaveLength(1); //should have one hover rule

    let hoverRuleDeclarations = hoverRules[0].declarations.filter((d) => d.type === 'declaration') //ignore comments
    
    expect(hoverRuleDeclarations[0].property).toEqual('background-color'); //has 'background-color' as property
    expect(hoverRuleDeclarations[0].value.toLowerCase()).toEqual('pink'); //has correct value
  })
})
