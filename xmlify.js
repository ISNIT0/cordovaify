const isLeaf = node => typeof node !== 'object';

const makeAttrs = node => {
  return Object.keys(node).reduce((acc, key) => {
    if(key !== 'content')
      return acc.concat(`${key}="${node[key]}"`);
    else
      return acc;
  }, []).join(' ');
}

const xmlify = json => {
  if(isLeaf(json))
    return json;

  return Object.keys(json).map(key => {
    if(isLeaf(json[key])) {
      return `<${key}>${json[key]}</${key}>`;
    } else {
      if(!Array.isArray(json[key])) {
        return `<${key} ${makeAttrs(json[key])}>${xmlify(json[key].content || '')}</${key}>`;
      } else {
        return json[key].map(attributes => {
          return `<${key} ${makeAttrs(attributes)}>${xmlify(attributes.content || '')}</${key}>`;
        }).join('\n\t');
      }
    }
  }).join('\n\t');
};

module.exports = xmlify;