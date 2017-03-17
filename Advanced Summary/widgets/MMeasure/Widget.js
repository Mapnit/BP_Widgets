
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/dom-style',  
  'dojo/dom-class',
  'dojo/dom-construct', 
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
function(declare, lang, array, domStyle, domClass, domConstruct, BaseWidget, on, aspect, Deferred, string,
  Graphic, Point, GraphicsLayer, SimpleLineSymbol, SimpleMarkerSymbol, SpatialReference, Geoprocessor, MeasureNode, TileLayoutContainer, utils, store) {
  return declare([BaseWidget], {
    //these two properties is defined in the BaseWidget
    baseClass: 'lsg-widget-mmeasure',
    name: 'MMeasure',

    _measureArray: [],
	
	_currentMeasurePair: [], 
	
	_measureMode: null, 
	
	_graphicsLayer: null, 

    currentIndex: -1,
	
	_bufferDistance: 1000 * 1000000, 
	
	mLayerDS: null, 

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
        itemSize: {width: 240, height: 80}, //image size is: 100*60,
        hmargin: 15,
        vmargin: 5
      }, this.measureListNode);

      this.measureList.startup();

	  this._graphicsLayer = new GraphicsLayer({
		id: this.baseClass + "_graphics"
	  });
	  
	  this._populateMLayers(); 
	  
	  this.own(on(this.mLayerNode, "change", lang.hitch(this, this._setMLayer))); 

	  this.own(on(this.btnClear, 'click', lang.hitch(this, function() {
		this._measureArray = []; 
		this._currentMeasurePair = []; 
		this._graphicsLayer.clear(); 
		this.displayMeasures();
	  }))); 
	  this.own(on(this.btnAddPointMeasure, 'click', lang.hitch(this, function() {
		// single-point click
		domClass.add(this.btnAddPointMeasure, 'lsgChecked');
		domClass.remove(this.btnAddLineMeasure, 'lsgChecked');
		this._measureMode = 'point'; 
		this._currentMeasurePair = [];
	  }))); 
	  this.own(on(this.btnAddPointMeasure, 'mouseover', lang.hitch(this, function() {
		domClass.add(this.btnAddPointMeasure, 'lsgHovered');
	  }))); 
	  this.own(on(this.btnAddPointMeasure, 'mouseout', lang.hitch(this, function() {
		domClass.remove(this.btnAddPointMeasure, 'lsgHovered');
	  }))); 
	  this.own(on(this.btnAddLineMeasure, 'click', lang.hitch(this, function() {
		// two-point clicks
		domClass.add(this.btnAddLineMeasure, 'lsgChecked');
		domClass.remove(this.btnAddPointMeasure, 'lsgChecked');
		this._measureMode = 'line'; 
		this._currentMeasurePair = [];
	  }))); 
	  this.own(on(this.btnAddLineMeasure, 'mouseover', lang.hitch(this, function() {
		domClass.add(this.btnAddLineMeasure, 'lsgHovered');
	  }))); 
	  this.own(on(this.btnAddLineMeasure, 'mouseout', lang.hitch(this, function() {
		domClass.remove(this.btnAddLineMeasure, 'lsgHovered');
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
        this._measureArray = localBks;
      }else{
		this._measureArray = [];
      }
	  
	  this.map.addLayer(this._graphicsLayer); 

      this.displayMeasures();
    },

    onClose: function(){
      // summary:
      //    see description in the BaseWidget
      this._measureArray = [];
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
	
	_populateMLayers: function() {
		var mLayers = this.config.mLayers; 
        if (mLayers.length < 1) {
		  console.log("mLayer drop down not configured");
		} else {
          for (var i = 0; i < mLayers.length; i++) {
            var obj = mLayers[i];
            var value = obj.dataSource;
            var label = obj.layerName;
            domConstruct.create("option", {
              value: value,
              innerHTML: label
            }, this.mLayerNode);
          }
        } 
	}, 
	
	_setMLayer: function() {
	  var list = this.mLayerNode; 
	  this.mLayerDS = this.config.mLayers[list.selectedIndex].dataSource; 
	},

	_calculateMValue: function(measurePts) {
	  console.debug("call the M-value service"); 
	  var deferred = new Deferred();
	  var gp = new Geoprocessor(this.config.calculateMServiceUrl);
	  var params = {
		"StartPointX": measurePts[0].x,
		"StartPointY": measurePts[0].y,
		"EndPointX": measurePts[1].x,
		"EndPointY": measurePts[1].y, 
		//TODO: required by the backend service
		"Line_Feature_Class": JSON.stringify({
			 "displayFieldName": "",
			 "hasZ": true,
			 "hasM": true,
			 "geometryType": "esriGeometryPolyline",
			 "spatialReference": {
			  "wkid": 102100,
			  "latestWkid": 3857
			 },
			 "fields": [
			  {
			   "name": "OBJECTID",
			   "type": "esriFieldTypeOID",
			   "alias": "OBJECTID"
			  },
			  {
			   "name": "StationSeriesID",
			   "type": "esriFieldTypeString",
			   "alias": "SeriesID",
			   "length": 50
			  },
			  {
			   "name": "OD",
			   "type": "esriFieldTypeDouble",
			   "alias": "OD"
			  },
			  {
			   "name": "Description",
			   "type": "esriFieldTypeString",
			   "alias": "Description",
			   "length": 100
			  },
			  {
			   "name": "GlobalID",
			   "type": "esriFieldTypeGlobalID",
			   "alias": "GlobalID",
			   "length": 38
			  },
			  {
			   "name": "SHAPE_Length",
			   "type": "esriFieldTypeDouble",
			   "alias": "SHAPE_Length"
			  }
			 ],
			 "features": [],
			 "exceededTransferLimit": false
			})
	  };
	  gp.execute(params, lang.hitch(this, function(results, messages) {
		var mStart, mEnd, mDistance; 
		if (results && results.length === 2) {
		  if (results[0].value) {
			if (results[0].value.hasM == true) {
			  var mp = (results[0].value.hasZ == true?3:2); 
			  if(results[0].value.paths.length === 2) {
				// first measure
				var mStart = results[0].value.paths[0][0][mp]; 
				// last measure
				var pl = results[0].value.paths[1].length; 
				var mEnd = results[0].value.paths[1][pl-1][mp]; 
			  } 
			} else {
			  deferred.reject({'message':'no M value enabled'}); 
			}
		  }
		  if (results[1].value) {
			mDistance = Number(results[1].value);
		  }
		  if (mDistance || (mStart && mEnd)) {
			deferred.resolve({'start':mStart, 'end':mEnd, 'distance':mDistance});
		  }
		}
		// reject non-parseable results
		deferred.reject({'message':'invalid calculation results'}); 
	  }), lang.hitch(this, function(error) {
		deferred.reject(error); 
	  })); 
	  
      return deferred.promise;
	}, 
	
    displayMeasures: function() {
      // summary:
      //    remove all and then add
      var items = [];
      this.measureList.empty();
	  this._graphicsLayer.clear(); 
      array.forEach(this._measureArray, function(measurePair) {
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

      array.forEach(this._measureArray, function(measurePair, i){
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
	  if (this._measureMode == 'point') {
		// add an extra point to create buffer
		var bufferPoint = lang.clone(this._currentMeasurePair[0]); 
		bufferPoint.x = bufferPoint.x + (bufferPoint.x / this._bufferDistance);
		bufferPoint.y = bufferPoint.y + (bufferPoint.y / this._bufferDistance);
		this._currentMeasurePair.push(bufferPoint); 
	  }
	  if (this._currentMeasurePair.length % 2 == 0) {
		this._calculateMValue(this._currentMeasurePair).then(
		  lang.hitch(this, function(results) {
			if (results.start && results.end) {
			  this._currentMeasurePair[0].m = results.start; 
			  this._currentMeasurePair[1].m = results.end;
			} else if (results.distance) {
			  this._currentMeasurePair[0].m = 0; 
			  this._currentMeasurePair[1].m = results.distance; 
			} else {
			  console.error(this.nls.invalidCalculationResult); 
			  return; 
			}
			this._createMeasurePair(this._currentMeasurePair, this._measureMode); 
			this._currentMeasurePair = []; 
			
			this.displayMeasures(); 
		  }), lang.hitch(this, function(error) { 
		    console.error(error.message || this.nls.calculationFailed); 
		  })); 
	  }		  
	}, 

    _createMeasurePair: function(measurePair, measureMode){
      this._measureArray.push(lang.clone(measurePair));
      
	  this._createMeasureNode(measurePair, measureMode);
      this._saveAllToLocalCache();
      this.resize();
    },

    _onDeleteBtnClicked: function(){

      if(!this._canDelete || this.currentIndex === -1){
        return;
      }

      array.some(this._measureArray, function(b, i){
        // jshint unused:false
        if(i === this.currentIndex){
		  this._measureArray.splice(i, 1);
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
      array.some(this._measureArray, function(b, i){
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