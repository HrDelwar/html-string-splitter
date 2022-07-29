// split html string with character count
function htmlStringSplitter(html = '', count = null, by = '', btn = ''){
    if (!html || typeof html !== 'string' || !count) return null;

    let forTotalCount = false;
    if (count === 'count') {
        forTotalCount = true;
    } else {
        count = Number(count);
        if (isNaN(count)) return null;
    }

    let htmlArr = html.match(/<[^> ]+[^>]*>[^<]*/g), htmlStr = '',  totalCount = 0;

    for ( let i = 0; i < htmlArr.length; i++){
        let element = htmlArr[i], tag, str;
        str = element.replace( /(<([^>]+)>)/ig, '').trim();
        if (by === 'word') {
            str =  str.split(' ').filter(el => el.length !== 0);
        }
        if (forTotalCount) {
            totalCount += str.length;
            continue;
        }
        tag = element.match(/(<([^>]+)>)/ig)[0];
        totalCount += str.length;

        if (totalCount <= count) {
            htmlStr += element
            if (!str.length) {
                continue;
            }
            if (totalCount === count) {
                htmlStr += '...' + (btn && typeof btn === 'string' ? btn : '');
            }
        } else {
            htmlStr += tag;
            if (!str.length) {
                continue;
            }
            totalCount -= str.length;
            let restCount = count - totalCount;
            if (restCount >= 1 && (totalCount + restCount) === count) {
                if (typeof str === 'string') {
                    htmlStr += str.substring(0, restCount);
                }
                if (typeof str === 'object') {
                    htmlStr += str.slice(0, restCount).join(' ');
                }
                htmlStr += '...' + (btn && typeof btn === 'string' ? btn : '');
            }
            totalCount += str.length;
        }

    }
    if (forTotalCount) {
        return totalCount;
    }
    return htmlStr;
}

function splitByWordCount(html ='', count = null, btn ='') {
    return htmlStringSplitter(html, count, 'word', btn);
}
 function splitByCharacterCount(html='', count= null, btn ='') {
    return htmlStringSplitter(html, count, '', btn);
}
function getCharacterCount(html=''){
    return htmlStringSplitter(html, 'count', '');
}
function getWordCount(html=''){
    return htmlStringSplitter(html, 'count', 'word');
}
module.exports ={
    splitByCharacterCount,
    splitByWordCount,
    getCharacterCount,
    getWordCount
}