// file: polyrex.js

// requires jaxle.js, and jfr.js

function scan_polyrex(node){
  
  var obj = new Object();
  obj.summary = node.xpath('summary/*').inject({}, function(r,node){
    obj[node.name().to_s()] = node.text();
    return r.merge(Hash(node.name().to_s(), node.text()));
  });
      
  obj.records = node.xpath('records/*').map(function(node){
    return scan_polyrex(node);
  });
  return obj;
}

function polyrexNew(file) {
  
  var doc = Jaxle.new(file);  
  polyrex = scan_polyrex(doc.firstChild);
  return polyrex;
}

Polyrex = {new: polyrexNew}

// -- start of dynarex data islands --------

function findHTMLRecordToClone(element) {

  parent = element.parentNode;
  parentName = rb.String.new(parent.nodeName).downcase();

  switch (parentName) {
    case 'body' : 
      return null; 
      break;
    case 'tr' : 
    case 'li' :
      return parent; 
      break;
    default :
      return findHTMLRecordToClone(parent);
  }
}
function innerDataIsland(record, destNodes, rec){
       
  if (record.records.length() > 0) {
    nestedDatafld  = destNodes.first().last().parentNode
      .element('ul/li/span[@datafld][1]');
    if (nestedDatafld != nil) {
      if (destNodes.keys().first() == nestedDatafld.attribute('datafld')
          .downcase()) {

        // everything inside the parent list item must be copied into the nested list item
        //   replacing the list item in the nested list.
        // --- start ---
        var innerRec = rec.cloneNode(true);
        innerLi = nestedDatafld.parentNode;            
        innerLi.parentNode.appendChild(innerRec);
        innerLi.delete();
        // --- end ---
        
        var recOriginal2 = innerRec;      
            
        var destNodes2 = rb.Hash.new();              
        
        record.records.each(function(record2){
          
          var rec2 = recOriginal2.cloneNode(true);
          recOriginal2.parentNode.appendChild(rec2);

          rec2.xpath('span[@datafld]').each(function(span){
            destNodes2.set(span.attribute('datafld').downcase(), span);
          });

          destNodes2.keys().each(function(field){
            if (record[field] != nil) 
              destNodes2.get(field).innerHTML = record2[field].to_s();
          });                
          
          // check for nested records here, and if none exist delete the stub.          
          if (innerDataIsland(record2, destNodes2, rec2)) {
          }
          else rec2.delete('ul[li/span/@datafld]');
          
        });
        
        recOriginal2.delete();      
      }
    } // end of if (nestedDatafld != nil) {

    return true;
  }  
  
  else return false;  

}

function dataIslandRender(file, node) {

  polyrex = Polyrex.new(file);
  recOriginal = findHTMLRecordToClone(node);
  
  if (recOriginal) {

    // get a reference to each element containing the datafld attribute
    var destNodes = o({});
    
    polyrex.records.each(function(record){
    
      var rec = recOriginal.cloneNode(true);
      recOriginal.parentNode.appendChild(rec);
     
      rec.xpath('span[@datafld]').each(function(span){
        destNodes.set(span.attribute('datafld').downcase(), span);
      });

      destNodes.keys().each(function(field){
        if (record[field] != nil) 
          destNodes.get(field).innerHTML = record[field].to_s();
      });    
      
      // are there any repeating nested records?                    
      if (innerDataIsland(record, destNodes, rec)) {
      }
      else rec.delete('ul[li/span/@datafld]');      
    });

    recOriginal.delete();
  }

}

function dataIslandInit(){
  document.xpath("//object[@type='text/xml']").each( function(x){
    xpath = "//*[@datasrc='#" + x.attribute('id').to_s() + "']"
    document.xpath(xpath).each(function(island){
      node = island.element('//span[@datafld]');
      dataIslandRender(x.attribute('data').to_s(), node);
    });
  });
}

polyrexDataIsland = {init: dataIslandInit}
//dynarexDataIsland.init();
//-- end of dynarex data islands