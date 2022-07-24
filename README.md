# html-string-splitter
Split html string by character or word count
<hr>

Simple installation by npm 
```
npm install html-string-splitter
```


###For commonjs


```
const splitter = require('html-string-splitter');

console.log(
    splitter.splitByCharacterCount(
        `<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>`,
         15
    )
)
/*
// output
  <p>This is text</p>spl...<a href="#"></a><strong></strong><p></p>
* */

console.log(
    splitter.splitByWordCount(
        `<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>`,
         6
    )
)
/*
// output
<p>This is text</p>split by <a href="#">character...</a><strong></strong><p></p>
*/
```



###For ES6 module
```
import {splitByCharacterCount, splitByWordCount} from 'html-string-splitter';

console.log(
    splitByCharacterCount(
        `<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>`,
         15
     )
)
/*
// output
  <p>This is text</p>spl...<a href="#"></a><strong></strong><p></p>
* */

console.log(
    splitByWordCount(
        `<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>`,
        6
    )
)
/*
// output
<p>This is text</p>split by <a href="#">character...</a><strong></strong><p></p>
*/
```

### With button
* Note - you can pass html button on third parameter which will added last of count
```
console.log(
    splitByCharacterCount(
        `<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>`,
         15,
         <button>Read More</button>
    )
)
/*
// output
  <p>This is text</p>spl...<btton>Read More</btton><a href="#"></a><strong></strong><p></p>
* */

```