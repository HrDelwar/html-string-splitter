# html-string-splitter
Split html string by character or word count
<hr>

Installation by npm
```
npm install html-string-splitter
```

Installation with yarn
```
yarn add html-string-splitter
```

Installation with bun
```
bun add html-string-splitter
```

## Methods
* splitByCharacterCount(htmlString, count, btn)
* splitByWordCount(htmlString, count, btn)
* getCharacterCount(htmlString)
* getWordCount(htmlString)

### About Parameters
* htmlString (required) The html in string format
* count (required) - The number of length
* btn (optional) - Read more button or any html string which is added after last length value

<strong>Note</strong>: If required parameter is not passed return with null value;

### Example commonjs
```
const splitter = require('html-string-splitter');

//split html string by character count
console.log(
    splitter.splitByCharacterCount(
        `<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>`,
         15
    )
)
//output: <p>This is text</p>spl...<a href="#"></a><strong></strong><p></p>



//split html string by word count
console.log(
    splitter.splitByWordCount(
        `<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>`,
         6
    )
)
//output: <p>This is text</p>split by <a href="#">character...</a><strong></strong><p></p>



//get html string word count 
console.log(
    splitter.getWordCount(
        `<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>`,
    )
)
//output: 10



//get html string character count 
console.log(
    splitter.getCharacterCount(
        `<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>`,
    )
)
//output: 49

```



### Example ES6 module
```
import {splitByCharacterCount, splitByWordCount, getWordCount, getCharacterCount} from 'html-string-splitter';

//split html string by catacter count
console.log(
    splitByCharacterCount(
        `<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>`,
         15
     )
)
//output: <p>This is text</p>spl...<a href="#"></a><strong></strong><p></p>



//split html string by word count
console.log(
    splitByWordCount(
        `<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>`,
        6
    )
)
//output: <p>This is text</p>split by <a href="#">character...</a><strong></strong><p></p>



//get html string word count 
console.log(
    getWordCount(
        `<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>`,
    )
)
//output: 10



//get html string character count 
console.log(
    getCharacterCount(
        `<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>`,
    )
)
//output: 49
```

### With button
* Note - you can pass html button on third parameter which will added after ... string
```
console.log(
    splitByCharacterCount(
        `<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>`,
         15,
         '<button>Read More</button>'
    )
)
//output: <p>This is text</p>spl...<button>Read More</button><a href="#"></a><strong></strong><p></p>


```