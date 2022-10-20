const fs = require('fs');
const prompt = require('prompt-sync')();


/**
 * Extract the value from a TD string
 */
const extractTdValue =  (td) => {
    if (!td) {

        return null;
    }
    const rawTdValue =  td.match(/>[ ]?(.*?)[ ]?</g);

    return rawTdValue ? rawTdValue[0].slice(1, -1) : null;
}

/**
 * Return a phpInfoRow object for a given TR string
 *
 *  {
 *      id,
 *      value,
 *      masterValue
 *  }
 */
const mapPhpInfo = (el) => {
    const tds =  [...el.matchAll("<td .*?>.*?<\\/td>")].map((el) => el[0]);

    return {
        id : extractTdValue(tds[0]),
        value : extractTdValue(tds[1]),
        masterValue : extractTdValue(tds[2]),
    }
}

/**
 * Group a phpInfoRow object (@see mapPhpInfo) by their ID
 *
 * Return an array of phpInfoGrouppedRows object [
 *
 *  {
 *      id,
 *      elements: [phpInfoRow, phpInfoRow]
 *  }
 * ]
 */
const groupPhpInfoConfigRowById = (acc, phpInfoRow) => {
    acc[phpInfoRow.id] ? acc[phpInfoRow.id]["elements"].push(phpInfoRow) : acc[phpInfoRow.id] = {id:phpInfoRow.id, elements : [phpInfoRow]}

    return acc;
}

/**
 * Return an phpDiffRow object if the two given phpInfoRows are different
 *
 * expect a phpInfoGrouppedRows object as second argument (@see groupPhpInfoConfigRowById)
 *
 */
const reducePhpInfoRows = (acc, phpInfoGrouppedRows) => {

    const firstElement = phpInfoGrouppedRows.elements[0];

    if (phpInfoGrouppedRows.elements.length < 2) {
        acc.push({
            id : firstElement.id,
            value1 : firstElement.value,
            masterValue1 : firstElement.masterValue,
            hasSecondValue: false,
            value2 : null,
            masterValue2 : null,
            areValuesEqual: false,
            areMasterValuesEqual: false,
        })
    }

    const secondElement = phpInfoGrouppedRows.elements[1];

    if (firstElement.value !== secondElement.value || firstElement.masterValue !== secondElement.masterValue) {
        acc.push({
            id : firstElement.id,
            value1 : firstElement.value,
            masterValue1 : firstElement.masterValue,
            hasSecondValue: false,
            value2 : secondElement.value,
            masterValue2 : secondElement.masterValue,
            areValuesEqual: firstElement.value === secondElement.value,
            areMasterValuesEqual: firstElement.masterValue === secondElement.masterValue,
        })
    }

    return acc;
}

const mapReducePhpInfoDiff = (phpinfo1, phpinfo2) => {
    const map1 = phpinfo1.map(mapPhpInfo)
    const map2 = phpinfo2.map(mapPhpInfo)

    return Object.values((map1.concat(map2)).reduce(groupPhpInfoConfigRowById, {})).reduce(reducePhpInfoRows, [])
}

const getStyle = () => {
    return '<style type="text/css">\n' +
        'body {background-color: #fff; color: #222; font-family: sans-serif;}\n' +
        'pre {margin: 0; font-family: monospace;}\n' +
        'a:link {color: #009; text-decoration: none; background-color: #fff;}\n' +
        'a:hover {text-decoration: underline;}\n' +
        'table {border-collapse: collapse; border: 0; width: 934px; box-shadow: 1px 2px 3px #ccc;}\n' +
        '.center {text-align: center;}\n' +
        '.center table {margin: 1em auto; text-align: left;}\n' +
        '.center th {text-align: center !important;}\n' +
        'td, th {border: 1px solid #666; font-size: 75%; vertical-align: baseline; padding: 4px 5px;}\n' +
        'h1 {font-size: 150%;}\n' +
        'h2 {font-size: 125%;}\n' +
        '.p {text-align: left;}\n' +
        '.e {background-color: #ccf; width: 300px; font-weight: bold;}\n' +
        '.h {background-color: #99c; font-weight: bold;}\n' +
        '.v {background-color: #ddd; max-width: 300px; overflow-x: auto; word-wrap: break-word;}\n' +
        '.v i {color: #999;}\n' +
        'img {float: right; border: 0;}\n' +
        'hr {width: 934px; background-color: #ccc; border: 0; height: 1px;}\n' +
        '</style>'
}

const displayDiff = (diffArray) => {
    let html = '<html>'

    html += getStyle();

    html += "<table><thead><tr><th>Variable</th><th>Valeur 1</th><th>Valeur 2</th><th>Master Valeur 1</th><th>Master Valeur 2</th></tr></thead><tbody>"
    html += diffArray.map((el) => {
        let row = '<tr>'

        row += `<td class="e">${el.id}</td>`;
        row += `<td class="e">${el.value1}</td>`;
        row += `<td class="e">${el.value2}</td>`;
        row += `<td class="e">${el.masterValue1}</td>`;
        row += `<td class="e">${el.masterValue2}</td>`;


        row += '</tr>'

        return row;
    }).join();


    html += '</tbody></table></html>'

    return html
}

const writeDiff = (diffArray, dest) => {
    fs.writeFileSync(dest, displayDiff(diffArray));
}

const getPhpInfoContent = async (url) => {
    return await (await fetch(url)).text()
}

const buildUrl = (baseUrl, username, password) => {
    if (!username || !password) {
        return baseUrl;
    }

    const baseUrlSplitted = baseUrl.split('://')

    return baseUrlSplitted[0] + "://" + username + ":" + password + "@" + baseUrlSplitted[1];
}

const getTrs = (phpinfo) => {
    return [...phpinfo.split('PHP Credits')[0].toString().matchAll("<tr>.*?<\\/tr>")].map((el) => el[0]);
}

const main = async () => {
    const phpinfo1Url =  prompt('Phpinfo1 URL');
    const phpinfo1Username =  prompt('Phpinfo1 Username');
    const phpinfo1Password =  prompt('Phpinfo1 Password');

    const phpinfo2Url =  prompt('Phpinfo2 URL');
    const phpinfo2Username =  prompt('Phpinfo2 Username');
    const phpinfo2Password =  prompt('Phpinfo2 Password');

    const phpInfo1 = await getPhpInfoContent(buildUrl(phpinfo1Url, phpinfo1Username, phpinfo1Password));
    const phpInfo2 = await getPhpInfoContent(buildUrl(phpinfo2Url, phpinfo2Username, phpinfo2Password));

    const diff = mapReducePhpInfoDiff(getTrs(phpInfo1), getTrs(phpInfo2))

    await writeDiff(diff, "/dest/index.html")

    console.log(diff)
}



main().finally(() => process.exit(0))
