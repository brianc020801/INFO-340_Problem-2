const fs = require('fs');
const cheerio = require('cheerio') //for html testing

//include custom matchers
const styleMatchers = require('jest-style-matchers');
expect.extend(styleMatchers);

const htmlPath = __dirname + '/index.html';
const html = fs.readFileSync(htmlPath, 'utf-8'); //load the HTML file once

describe('Source code is valid', () => {
  test('HTML validates without errors', async () => {
    const lintOpts = {
      'attr-bans':['align', 'background', 'bgcolor', 'border', 'frameborder', 'marginwidth', 'marginheight', 'scrolling', 'style', 'width', 'height'], //adding height, allow longdesc
      'tag-bans':['style','b'], //<i> allowed for font-awesome
      'doctype-first':true,
      'doctype-html5':true,
      'html-req-lang':true,
      'attr-name-style': false, //for meta tags
      'line-end-style':false, //either way
      'indent-style':false, //can mix/match
      'indent-width':false, //don't need to beautify
      'line-no-trailing-whitespace': false, //don't need to beautify
      'class-style':'none', //I like dashes in classnames
      'img-req-alt':false, //for this test; captured later!
    }

    await expect(htmlPath).toHaveNoHtmlLintErrorsAsync(lintOpts);
  })
});

let $; //cheerio instance
beforeAll(() => {
  $ = cheerio.load(html);
})

describe('Includes semantic sectioning elements', () => {
  test('Has header, main, and footer sections', () => {
    let bodyChildren = $('body').children();
    expect(bodyChildren.length).toEqual(3);
    expect(bodyChildren[0].tagName).toMatch('header'); //body's first child is header
    expect(bodyChildren[1].tagName).toMatch('main');  //body's second child is main
    expect(bodyChildren[2].tagName).toMatch('footer'); //body's third child is footer
  })

  test('Header has appropriate content', () => {
    //header has correct text
    expect($('body > header').text().trim()).toMatch(/My Photo Journal\W+A collection of photographs/);
  })

  test('Main has appropriate sections', () => {
    let mainSections = $('main').children();
    expect(mainSections.length).toEqual(2); //main has two sections

    expect(mainSections.eq(0).text()).toMatch(/The Cutest Puppy/) //has correct content
    expect(mainSections.eq(0).text()).not.toMatch(/Leave a comment/)
    expect(mainSections.eq(1).text()).toMatch(/Leave a comment/) //has correct content
    expect(mainSections.eq(1).text()).not.toMatch(/The Cutest Puppy/)
  })

  test('First main section has a header', () => {
    let firstSection = $('main > section').first()
    let firstSectionChild = firstSection.children().eq(0)
    expect(firstSectionChild[0].tagName).toMatch('header')
    expect(firstSectionChild.text()).toMatch(/The Cutest Puppy/)
    expect(firstSectionChild.text()).toMatch(/Posted/)
    expect(firstSectionChild.text()).not.toMatch(/OMG I found/)
  })
})

describe('Has appropriate headings', () => {
  test("Headings are hierarchical (don't skip h2)", () => {
    //don't have implemantation for outline algorithm
    //just check counts for now
    expect($('h2').length).toEqual(2); //has 2 <h1>
    expect($('h3').length).toEqual(0); //has 0 <h3>
  });

  test("Headings are meaningful", () => {
    let commentHeading = $('main > section:last-child h2.text-small')
    //comment heading is a styled h2, not an h3
    expect(commentHeading.length).toEqual(1); //has h2.text-small element in last section

    expect($('h6').length).toEqual(0); //should not have an <h6>    
    expect($('p.time-posted').length).toEqual(1); //should have a paragraph with `.time-posted` instead
  });
})

describe('Content is annotated for machines/screen-readers', () => {
  test('Posted time includes a `<time>` element', () => {
    let timeElement = $('time');
    expect(timeElement.length).toEqual(1) //has an element
    let datetime = $(timeElement).attr('datetime')
    expect(datetime).toEqual('2021-09-01') //has correct date
  })

  test('Image has alternative text', () => {
    let alt = $('img').attr('alt');
    expect(alt).toBeDefined(); //has alt attribute
    expect(alt.length).toBeGreaterThan(3); //alt attribute has content
    expect(alt.toLowerCase()).not.toMatch(/(image|picture) of/i); //alt attribute should NOT mention image
  })
})

describe('Uses semantic tags for text', () => {
  test('Uses <em> elements for emphasis', () => {
    let emElement = $('em')
    expect(emElement.length).toBe(1)
    expect(emElement.text()).toMatch('CUTEST')

    expect($('i').text()).not.toMatch('CUTEST') //not in i
  })

  test('Uses <cite> elements for citations', () => {
    let citeElement = $('cite');
    expect(citeElement.length).toBe(1)

    let citation = citeElement.html().split('\n').join(' ').replace(/\s{2,}/,' ');
    let content = new RegExp('"Blizzard, the pup in Antarctica", by Frank Harvey. From the <a href="https://www.flickr.com/photos/statelibraryofnsw/2959326615/">State Library of NSW</a>')
    expect(citation).toMatch(content); //<cite> contains all the content
    expect($('i').html().split('\n').join(' ').replace(/\s{2,}/,' ')).not.toMatch(content) //not in i

  })
})

describe('Form is accessible', () => {
  test('Inputs have appropriate `type` attributes', () => {
    expect($('#email_input').attr('type')).toEqual('email')
    expect($('#password_input').attr('type')).toEqual('password')
  })

  test('Inputs have appropriate `name` attributes', () => {
    expect($('#email_input').attr('name')).toEqual('email')
    expect($('#password_input').attr('name')).toEqual('password')
    expect($('#comment_field').attr('name')).toEqual('comment')
  })

  test('Inputs have preceding <label> elements', () => {
    let formLabels = $('form label')
    expect(formLabels.length).toEqual(3) //3 labels

    let emailLabel = formLabels.eq(0)
    expect(emailLabel.attr('for')).toEqual('email_input') //has for attribbute
    expect(emailLabel.html()).toMatch('Email:') //has correct content
    expect(emailLabel.next().attr('id')).toEqual('email_input') //next element is input#email_input

    let passwordLabel = formLabels.eq(1)
    expect(passwordLabel.attr('for')).toEqual('password_input') //has for attribbute
    expect(passwordLabel.html()).toMatch('Password:') //has correct content
    expect(passwordLabel.next().attr('id')).toEqual('password_input') //next element is input#password_input

    let commentLabel = formLabels.eq(2)
    expect(commentLabel.attr('for')).toEqual('comment_field') //has for attribbute
    expect(commentLabel.html()).toMatch('Comment:') //has correct content
    expect(commentLabel.next().attr('id')).toEqual('comment_field') //next element is textarea#comment_field
  })

  test('Button icon has an `aria-label', () => {
    let iconElement = $('button > i');
    expect(iconElement.attr('aria-label')).toEqual('Submit')
  })
})

describe('Footer is semantically accurate', () => {
  test('Contact info annotated', () => {
    let address = $('address');
    expect(address.length).toEqual(1); //has <address> element
    expect(address.parent('footer').length).toEqual(1); //<address> in <footer>
    expect(address.html()).toMatch(/Contact me at/); //<address> contains info
    expect(address.html()).not.toMatch(/This blog was/); //<address> doesn't include author
    expect(address.html()).not.toMatch(/2019 The Author./); //<address> doesn't include copyright
    expect(address.html()).not.toMatch(/UW Information School/); //<address> only in footer!
  })

  test('Email has a link', () => {
    let mail = $('a[href="mailto:me@here.com"]');
    expect(mail.length).toEqual(1); //has link with email formatting
    expect(mail.html()).toEqual('me@here.com') //email link on correct content
  })

  test('Telephone number has a link', () => {
    let tel = $('a[href="tel:555-123-4567"]');
    expect(tel.length).toEqual(1); //has link with telephone formatting
    expect(tel.html()).toEqual('(555) 123-4567'); //telephone link on correct content
  })

  test('Copyright symbol is an HTML character entity', () => {
    let copyright = $('footer').children().last()
    //console.log(copyright.text())
    expect(copyright.html()).toMatch(/©/) //expected entity
    expect(html).toMatch("&copy;") // uses a human-readable character entity
    expect(copyright.text()).not.toMatch('copyright')
  })
})
