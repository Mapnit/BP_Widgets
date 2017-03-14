
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/dom-style',  
  'dojo/dom-class',
  'jimu/BaseWidget',
  'dojo/on',
  'dojo/aspect',
  'dojo/Deferred', 
  'dojo/string',
  'esri/graphic', 
  'esri/geometry/Point', 
  'esri/layers/GraphicsLayer', 
  'esri/symbols/SimpleLineSymbol', 
  'esri/symbols/SimpleMarkerSymbol',  
  'esri/SpatialReference',
  'esri/tasks/Geoprocessor',
  './MeasureNode',
  'jimu/dijit/TileLayoutContainer',
  'jimu/utils',
  'libs/storejs/store'
],
function(declare, lang, array, domStyle, domClass, BaseWidget, on, aspect, Deferred, string,
  Graphic, Point, GraphicsLayer, SimpleLineSymbol, SimpleMarkerSymbol, SpatialReference, Geoprocessor, MeasureNode, TileLayoutContainer, utils, store) {
  return declare([BaseWidget], {
    //these two properties is defined in the BaseWidget
    baseClass: 'lsg-widget-mmeasure',
    name: 'MMeasure',

    measurePairs: [],
	
	_currentMeasurePair: [], 
	
	_graphicsLayer: null, 

    //currentIndex: int
    //    the current selected bookmark index
    currentIndex: -1,

    //use this flag to control delete button
    _canDelete: false,

    startup: function(){
      // summary:
      //    this function will be called when widget is started.
      // description:
      //    see dojo's dijit life cycle.
      this.inherited(arguments);

      this.measureList = new TileLayoutContainer({
        strategy: 'fixWidth',
        itemSize: {width: 220, height: 80}, //image size is: 100*60,
        hmargin: 15,
        vmargin: 5
      }, this.measureListNode);

      this.measureList.startup();

	  this._graphicsLayer = new GraphicsLayer({
		id: this.baseClass + "_graphics"
	  });

	  this.own(on(this.btnClear, 'click', lang.hitch(this, function() {
		this.measurePairs = []; 
		this._currentMeasurePair = []; 
		this._graphicsLayer.clear(); 
		this.displayMeasures();
	  }))); 
	  this.own(on(this.btnAddMeasure, 'click', lang.hitch(this, function() {
		// check the feature select button
		domClass.add(this.btnAddMeasure, 'lsgChecked');
	  }))); 
	  this.own(on(this.btnAddMeasure, 'mouseover', lang.hitch(this, function() {
		domClass.add(this.btnAddMeasure, 'lsgHovered');
	  }))); 
	  this.own(on(this.btnAddMeasure, 'mouseout', lang.hitch(this, function() {
		domClass.remove(this.btnAddMeasure, 'lsgHovered');
	  }))); 
	  this.own(on(this.map, 'click', lang.hitch(this, this._addMeasurePoint))); 
    },
	
    onOpen: function(){
      // summary:
      //    see description in the BaseWidget
      // description:
      //    this function will check local cache first. If there is local cache,
      //    use the local cache, or use the measures configured in the config.json
      var localBks = this._getLocalCache();
      if(localBks.length > 0){
        this.measurePairs = localBks;
      }else{
		this.measurePairs = [];
      }
	  
	  this.map.addLayer(this._graphicsLayer); 

      this.displayMeasures();
    },

    onClose: function(){
      // summary:
      //    see description in the BaseWidget
      this.measurePairs = [];
      this.currentIndex = -1;
	  
	  this.map.removeLayer(this._graphicsLayer); 
	  this._graphicsLayer.clear(); 
    },

    onMinimize: function(){
      this.resize();
    },

    onMaximize: function(){
      this.resize();
    },

    resize: function(){
      if(this.measureList){
        this.measureList.resize();
      }
    },

    destroy: function(){
	  this._graphicsLayer = null; 
      this.measureList.destroy();
      this.inherited(arguments);
    },

	_calculateMValue: function(measurePts) {
	  console.debug("call the M-value service"); 
	  var deferred = new Deferred();
	  setTimeout(lang.hitch(this, function() {
		var r = {
		  "results": [{
			"paramName": "Output_Graphic",
			"dataType": "GPString",
			"value": {}
		  }, {
		    "paramName": "Result_Length",
		    "dataType": "GPString",
		    "value": "-306.423999999999"
		   }
		 ],
		 "messages": []
		};
		deferred.resolve(r["results"]); 
	  }), 500); 
	  /*
	  var gp = new Geoprocessor(this.config.calculateMServiceUrl);
	  var params = {
		"StartPointX": measurePts[0].x,
		"StartPointY": measurePts[0].y,
		"EndPointX": measurePts[1].x,
		"EndPointY": measurePts[1].y, 
		"Baseline": 
	  };
	  gp.execute(params, lang.hitch(this, function(results, messages) {
		var mDistance = -1; 
		if (results && results.length === 2 && results[1]["value"]) {
		  mDistance = Number(results[1]["value"]); 
		}
		//deferred.resolve({'firstPoint': {'M':0}, 'lastPoint': {'M':mDistance}}); 
		deferred.resolve(r["results"]);
	  }), lang.hitch(this, function(error) {
		deferred.reject(error); 
	  }));
	   */
      return deferred.promise;
	}, 
	
    displayMeasures: function() {
      // summary:
      //    remove all and then add
      var items = [];
      this.measureList.empty();
	  this._graphicsLayer.clear(); 
      array.forEach(this.measurePairs, function(measurePair) {
        items.push(this._createMeasureNode(measurePair));
		this.plotMeasuresOnMap(measurePair); 
      }, this);

      this.measureList.addItems(items);
      this._switchDeleteBtn();
      this.resize();
    },
	
	plotMeasuresOnMap: function(measurePair) {
		var startMarker = new SimpleMarkerSymbol(this.config.startMarkerSymbol);
		var endMarker = new SimpleMarkerSymbol(this.config.endMarkerSymbol);		
		array.forEach(measurePair, lang.hitch(this, function(mPt, i) {
			this._graphicsLayer.add(new Graphic(
			  new Point(mPt.x, mPt.y, mPt.spatialReference), 
			  i%2==0?startMarker:endMarker)
			);
		})); 
	}, 

    _switchDeleteBtn: function(){
      if(this.currentIndex > -1){
        domClass.remove(this.btnDelete, 'jimu-state-disabled');
        this._canDelete = true;
      }else{
        domClass.add(this.btnDelete, 'jimu-state-disabled');
        this._canDelete = false;
      }
    },

    _createMeasureNode: function(measurePair) {

	  array.forEach(measurePair, lang.hitch(this, function(mPt, idx) {
	    if (!mPt.name) {
		  mPt.name = (idx%2==0?this.nls.startPoint:this.nls.endPoint); 
		  mPt.xLabel = this.nls.xLabel; 
		  mPt.yLabel = this.nls.yLabel; 
		  mPt.mLabel = this.nls.mLabel; 
		}
	  })); 

      var node = new MeasureNode({
        measurePoints: measurePair
      });
	  
      on(node.domNode, 'click', lang.hitch(this, lang.partial(this._onMeasureClick, measurePair)));

      return node;
    },

    _getKeysKey: function(){
      return this.name + '.Measures';
    },

    _saveAllToLocalCache: function() {
      var keys = [];
      //clear
      array.forEach(store.get(this._getKeysKey()), function(bName){
        store.remove(bName);
      }, this);

      array.forEach(this.measurePairs, function(measurePair, i){
        var key = this._getKeysKey() + '.' + i;
        keys.push(key);
        store.set(key, measurePair);
      }, this);

      store.set(this._getKeysKey(), keys);
    },

    _getLocalCache: function() {
      var ret = [];
      if(!store.get(this._getKeysKey())){
        return ret;
      }
      array.forEach(store.get(this._getKeysKey()), function(bName){
        if(bName.startWith(this._getKeysKey())){
          ret.push(store.get(bName));
        }
      }, this);
      return ret;
    },
	
	_addMeasurePoint: function(evt) {
	  this._currentMeasurePair.push({ 
		'x': evt.mapPoint.x, 
		'y': evt.mapPoint.y, 
		'spatialReference': evt.mapPoint.spatialReference
	  }); 
	  if (this._currentMeasurePair.length % 2 == 0) {
		this._calculateMValue(this._currentMeasurePair).then(
		  lang.hitch(this, function(results) {
			var mDistance = Number(results[1].value);
			mDistance = Math.round(mDistance * 1000) / 1000; 
			this._currentMeasurePair[0].m = 0; 
			this._currentMeasurePair[1].m = mDistance; 
			this._createMeasurePair(this._currentMeasurePair); 
			this._currentMeasurePair = []; 
			
			this.displayMeasures(); 
		  }), lang.hitch(this, function(error) { 
		    console.error(error.message || this.nls.calculationFailed); 
		  })); 
	  }	
	}, 

    _createMeasurePair: function(measurePair){
      this.measurePairs.push(lang.clone(measurePair));
      
	  this._createMeasureNode(measurePair);
      this._saveAllToLocalCache();
      this.resize();
    },

    _onDeleteBtnClicked: function(){

      if(!this._canDelete || this.currentIndex === -1){
        return;
      }

      array.some(this.measurePairs, function(b, i){
        // jshint unused:false
        if(i === this.currentIndex){
		  this.measurePairs.splice(i, 1);
          return true;
        }
      }, this);
	  
	  var pointsToDelete = [
		this._graphicsLayer.graphics[this.currentIndex*2],
		this._graphicsLayer.graphics[this.currentIndex*2+1]
	  ]; 
	  array.forEach(pointsToDelete, function(p, i) {
		this._graphicsLayer.remove(p); 
	  }, this); 

      this._saveAllToLocalCache();

      this.resize();

      this.currentIndex = -1;
      this.displayMeasures();
    },

    _onMeasureClick: function(measurePair) {
      // summary:
      //    set the map extent or camera, depends on it's 2D/3D map
      array.some(this.measurePairs, function(b, i){
        if(b.uid === measurePair.uid){
          this.currentIndex = i;
          return true;
        }
      }, this);

      this._switchDeleteBtn();

      //require the module on demand
      require(['esri/geometry/Extent'], lang.hitch(this, function(Extent){
		var ext, sr; 
		if (measurePair.extent) {
		  ext = measurePair.extent; 
		} else {
		  ext = new Extent(
		    Math.min(measurePair[0].x, measurePair[1].x), 
			Math.min(measurePair[0].y, measurePair[1].y), 
			Math.max(measurePair[0].x, measurePair[1].x), 
			Math.max(measurePair[0].y, measurePair[1].y), 
			this.map.spatialReference
		  ); 
		}
        this.map.setExtent(ext.expand(3));
      }));
    }
  });
	
});