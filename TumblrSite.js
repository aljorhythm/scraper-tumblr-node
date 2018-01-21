const TumblrPage = require('./TumblrPage.js');

class TumblrSite {
  constructor(name){
    this.name = name;
    this.pages = {};
  }
  get name(){
    return this._name;
  }
  set name(name){
    this._name = name;
  }
  getPage(index){
    if(this.pages[index]){
      return this.pages[index];
    }else{
      const page = new TumblrPage(this.name, index);
      this.pages[index] = page;
      return page;
    }
  }
}

module.exports = TumblrSite;