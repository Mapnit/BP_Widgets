define([
  'dojo/_base/declare',
  'jimu/BaseWidget',
  'dojo/Evented',
  'dijit/_OnDijitClickMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/on',
  'dojo/aspect',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/_base/array',
  'dojo/_base/json',
  'dojo/number',
  'dijit/registry',
  'dijit/form/Button',
  'dijit/form/ToggleButton',
  'put-selector/put',
  'dojo/dom',
  'dojo/dom-geometry',
  'dojo/dom-style',
  'dojo/dom-class',
  'dojo/_base/Color',
  'dojo/colors',
  'dojo/fx/easing',
  'dojox/charting/Chart',
  'dojox/charting/axis2d/Default',
  'dojox/charting/plot2d/Grid',
  'dojox/charting/plot2d/Areas',
  'dojox/charting/action2d/MouseIndicator',
  'dojox/charting/action2d/TouchIndicator',
  'dojox/charting/themes/ThreeD',
  'esri/sniff',
  'esri/request',
  'esri/tasks/Geoprocessor',
  'esri/geometry/Polyline',
  'esri/symbols/SimpleLineSymbol',
  'esri/symbols/SimpleMarkerSymbol',
  'esri/graphic',
  'esri/tasks/FeatureSet',
  'esri/tasks/LinearUnit',
  'esri/geometry/geodesicUtils',
  'esri/geometry/webMercatorUtils',
  'esri/units',
  'jimu/utils',
  'esri/dijit/Measurement',
  'dojo/_base/html',
  'dijit/ProgressBar',
  'jimu/dijit/TabContainer',
  'jimu/dijit/Message',
  'dojo/query', 
  'dojo/dom-construct',
  'dojo/dom-attr',
  'dojo/_base/window',
  'dojo/window',
  'dojo/_base/fx',
  'jimu/dijit/LoadingShelter',
  'dojo/promise/all',
  'esri/geometry/Geometry',
  'esri/geometry/Point',
  'esri/geometry/Extent',
  'esri/tasks/query',
  'esri/tasks/QueryTask',
  'esri/tasks/IdentifyTask',
  'esri/tasks/IdentifyParameters'


],
  function (declare, BaseWidget, Evented, _OnDijitClickMixin, _WidgetsInTemplateMixin,
    on, aspect, lang, Deferred, array, dojoJson, number, registry, Button, ToggleButton,
    put, dom, domGeometry, domStyle, domClass, Color, colors, easing,
    Chart, Default, Grid, Areas, MouseIndicator, TouchIndicator, ThreeD, esriSniff,
    esriRequest, Geoprocessor, Polyline, SimpleLineSymbol, SimpleMarkerSymbol,
    Graphic, FeatureSet, LinearUnit, geodesicUtils, webMercatorUtils, Units, utils,
   // IdentifyTask, IdentifyParameters, Query, QueryTask,
	Measurement, html, ProgressBar, TabContainer, Message, dojoQuery, domConstruct, domAttr, baseWin, win, fx,
	all, IdentifyTask, IdentifyParameters, Query, QueryTask, Point, Geometry, Extent) {
    return declare([BaseWidget, _OnDijitClickMixin, _WidgetsInTemplateMixin, Evented], {

      baseClass: 'widget-elevation-profile',
      declaredClass: 'ElevationsProfile',
      samplingPointCount: 20, // 5, // bumped up IFG 2015-10-16
      profileService: null,
      loaded: false,
      domNode: put('div#profileChartNode'),
      profileTaskUrl: null,
      scalebarUnits: null,
      elevLineSymbol: null,
      measureTool: null,
      lastMeasure: null,
      _sourceStr: null,
      _gainLossStr: null,
	  returngeometryforzoom: true,
	  identifylayeroption: 'visible',
	  identifytolerance: 5,
	_maxPointCount: 4000,
	  clickEvtWire: null,
	 // identifyTask: null, 
	 // identifyParams: null,
	 // identifyTaskUrl: null,
      /**
       *  POSTCREATE - CONNECT UI ELEMENT EVENTS
       */
      postCreate: function () {
        this.inherited(arguments);
        var target = false,
            tooltip = false,
            tip = false;
        on(this.btnInfo, 'mouseenter', lang.hitch(this, function(evt){
          target = evt.target;
          tip = domAttr.get(target, 'title');
          tooltip = domConstruct.create('div', {id: 'tooltip', innerHTML: tip, style: {opacity: 0}}, this.domNode);

          if(!tip || tip === ''){
            return false;
          }
          domAttr.remove(target, 'title');
          var init_tooltip = lang.hitch(this, function()
          {
            //registry.getEnclosingWidget(this.domNode)
            if(win.getBox().w < tooltip.clientWidth * 1.5){
                domStyle.set(tooltip, 'max-width', win.getBox().w / 2);
            }else{
                domStyle.set(tooltip, 'max-width', 340);
            }
            var pos_left = target.offsetLeft + ( target.clientWidth / 2 ) - (tooltip.clientWidth / 2),
                pos_top  = target.offsetTop - tooltip.clientHeight - 20;

            if( pos_left < 0 ){
              pos_left = target.offsetLeft + target.clientWidth / 2 - 20;
              domClass.add(tooltip, 'left');
            }else{
              domClass.remove(tooltip, 'left');
            }
            if( pos_left + tooltip.clientWidth > win.getBox().w){
              pos_left = target.offsetLeft - tooltip.clientWidth + target.clientWidth / 2 + 20;
              domClass.add(tooltip, 'right');
            }else{
              domClass.remove(tooltip, 'right');
            }
            if( pos_top < 0 ){
              pos_top  = target.offsetTop + target.clientHeight;
              domClass.add(tooltip, 'top');
            }else{
              domClass.remove(tooltip, 'top');
            }
            //domStyle.set(tooltip, 'left', pos_left);
            domStyle.set(tooltip, 'top', pos_top + 81 + 'px' );
            fx.animateProperty({
              node: tooltip,
              duration: 500,
              properties: {
                opacity: {end: 1, start:0},
                top: '+=10'
              }
            }).play();
          });

          init_tooltip();
          on(registry.getEnclosingWidget(this.domNode), 'resize', init_tooltip);

          var remove_tooltip = function()
          {
            fx.animateProperty({
              node: tooltip,
              duration: 50,
              properties: {
                opacity: {end: 0, start:0.9},
                top: '-=10'
              }
            }).play();
            domConstruct.destroy(tooltip);
            domAttr.set(target, 'title', tip);
          };

          on(target, 'mouseleave', remove_tooltip);
          on(tooltip, 'click', remove_tooltip);
        }));
        this.scalebarUnits = this.config.scalebarUnits;
        this.chartRenderingOptions = lang.mixin({}, this.config.chartRenderingOptions);
        this.profileServiceUrl = lang.replace('{0}/Profile', [this.config.profileTaskUrl]);
        this.own(
          aspect.after(registry.getEnclosingWidget(this.domNode), 'resize', lang.hitch(this, this._resizeChart), true)
        );
        this._initProfileService = lang.hitch(this, this._initProfileService);
        this.displayProfileChart = lang.hitch(this, this.displayProfileChart);
        this.clearProfileChart = lang.hitch(this, this.clearProfileChart);
        this._updateProfileChart = lang.hitch(this, this._updateProfileChart);
        this._createProfileChart = lang.hitch(this, this._createProfileChart);
        this._getDisplayValue = lang.hitch(this, this._getDisplayValue);
        this._initMeasureTool = lang.hitch(this, this._initMeasureTool);
		this._initIdentifyTool = lang.hitch(this, this._initIdentifyTool);
        this._initTabContainer();
        this._initProgressBar();

        if (this.config.symbols && this.config.symbols.simplelinesymbol) {
          this.elevLineSymbol = new SimpleLineSymbol(this.config.symbols.simplelinesymbol);
        } else {
          this.elevLineSymbol = new SimpleLineSymbol();
        }
        this._bindEvents();
        this._initMeasureTool();
		this._initFeatureSelectTool();
		
		this.identifyServiceUrl = this.config.identifyTaskUrl;
		this.excludeLayers = this.config.layers.excludelayer;
		//this.identifytolerance = this.config.identifytolerance;
      },

      /**
       *  STARTUP THE DIJIT
       */
      startup: function () {
        this.inherited(arguments);
        this._initUI();
      },

      _initTabContainer: function () {
        var tabs = [];
        tabs.push({
          title: this.nls.measurelabel,
          content: this.tabNode1
        });
        tabs.push({
          title: this.nls.resultslabel,
          content: this.tabNode2
        });
        this.selTab = this.nls.measurelabel;
        this.tabContainer = new TabContainer({
          tabs: tabs,
          selected: this.selTab
        }, this.tabMain);

        this.tabContainer.startup();
        this.own(on(this.tabContainer, 'tabChanged', lang.hitch(this, function (title) {
          if (title !== this.nls.resultslabel) {
            this.selTab = title;
          }
        })));
        utils.setVerticalCenter(this.tabContainer.domNode);
      },

      _initProgressBar: function () {
        this.progressBar = new ProgressBar({
          indeterminate: true
        }, this.progressbar);
        html.setStyle(this.progressBar.domNode, 'display', 'none');
      },
	  
	  showMessage : function (msg, type) {

			var class_icon = "message-info-icon";
			switch (type) {
			case "error":
				class_icon = "message-error-icon";
				break;
			case "warning":
				class_icon = "message-warning-icon";
				break;
			}

			var content = '<i class="' + class_icon + '">&nbsp;</i>' + msg;

			new Message({
				message : content
			});
		},

      onClose: function () {
        if (this.measureTool) {
          this.measureTool.setTool("distance", false);
          this.measureTool.clearResult();
          this._displayChartLocation(-1);
        }
		this.tabContainer.selectTab(this.nls.measurelabel);
		this._clear();
		//this.clearProfileChart();
		if (this.clickEvtWire) {
          this.clickEvtWire.remove();
        }
      },

      onOpen: function () {
		  
		this.tabContainer.selectTab(this.nls.measurelabel);
		this._clear();
		this.measureTool.clearResult();
		this.clearProfileChart();
		var widgetTitlebar = this.domNode.parentNode.parentNode.parentNode.childNodes[0];
		if(typeof widgetTitlebar.onmousedown !== "function") {
			this.own(on(widgetTitlebar, 'mousedown', lang.hitch(this, function(event) {
				event.stopPropagation();
				if(event.altKey){
				  var msgStr = this.nls.widgetverstr + ': ' + this.manifest.version;
				  msgStr += '\n' + this.nls.wabversionmsg + ': ' + this.manifest.wabVersion;
				  msgStr += '\n' + this.manifest.description;
				  new Message({
					titleLabel: this.nls.widgetversion,
					message: msgStr
				  });
				}
			})));
		}
			
			/*this._clear();
			this.measureTool.clearResult();
			this.clearProfileChart();*/
			/*if (this.lastMeasure && this.measureTool) {
			  this.measureTool.measure(this.lastMeasure);
			}*/

		// replace the tooltip shown for the Distance measure tool -- IFG 2015-10-19
		var distanceTooltip = dom.byId("dijit_form_ToggleButton_1");
		if (distanceTooltip) {
			distanceTooltip.title = "Draw Line";
		}
		
		// disable infoWindow
		this.map.setInfoWindowOnClick(false);
		this.disableWebMapPopup(); 
      },
	  
	  // init the FeatureSelect button
	  _initFeatureSelectTool: function() {
		this.own(on(this._featureSelectNode, 'click', lang.hitch(this, function() {
		  // check the feature select button
		  domClass.add(this._featureSelectNode, 'lsgChecked');
		  // set the result title
		  var resultLabel = dojoQuery(".esriMeasurementResultLabel"); 
		  if (resultLabel && resultLabel.length > 0) {
			resultLabel[0].innerHTML = "Selected Feature"; 
		  }	
		  this._featureClick(); 
		}))); 
		this.own(on(this._featureSelectNode, 'mouseover', lang.hitch(this, function() {
		  domClass.add(this._featureSelectNode, 'lsgHovered');
		}))); 
		this.own(on(this._featureSelectNode, 'mouseout', lang.hitch(this, function() {
		  domClass.remove(this._featureSelectNode, 'lsgHovered');
		}))); 
		
	  }, 

      /**
       * INITIALIZE ESRI MEASUREMENT DIJIT
       *
       * @private
       */
      _initMeasureTool: function () {
		if (this.clickEvtWire) {
          this.clickEvtWire.remove();
        }
        // MEASUREMENT TOOL //
        this.measureTool = new Measurement({
          map: this.map,
          lineSymbol: this.elevLineSymbol,
          defaultAreaUnit: (this.scalebarUnits === 'metric') ? Units.SQUARE_KILOMETERS : Units.SQUARE_MILES,
          defaultLengthUnit: (this.scalebarUnits === 'metric') ? Units.KILOMETERS : Units.MILES
        }, this._measureNode);
        aspect.after(this.measureTool, 'setTool', lang.hitch(this, function () {
          if (this.measureTool.activeTool) {
            this.map.setInfoWindowOnClick(false);
            this.disableWebMapPopup();
          } else {
            //this.map.setInfoWindowOnClick(true);
            //this.enableWebMapPopup();
          }
        }));
        this.measureTool.startup();

        // HIDE AREA AND LOCATION TOOLS //
        this.measureTool.hideTool('area');
        this.measureTool.hideTool('location');

        //Activate then deactivate the distance tool to enable the measure units
        on.once(this.measureTool, "tool-change", lang.hitch(this, function () {
          this.measureTool.setTool("distance", false);
          this.measureTool.clearResult();
        }));
        this.measureTool.setTool("distance", true);

        // CREATE PROFILE ON DISTANCE MEASURE-END EVENT //
        this.measureTool.on('measure-end', lang.hitch(this, this._onMeasureEnd));

        // Clear existing profiles when distance tool is clicked.
        this.measureTool._distanceButton.on("click", lang.hitch(this, this._onMeasureClick));

        // Update the chart when units change
        on(this.measureTool, "unit-change", lang.hitch(this, this._unitsChanged), true);
      },

      disableWebMapPopup: function () {
        if (this.map && this.map.webMapResponse) {
          var handler = this.map.webMapResponse.clickEventHandle;
          if (handler) {
            handler.remove();
            this.map.webMapResponse.clickEventHandle = null;
          }
        }
      },

      enableWebMapPopup: function () {
        if (this.map && this.map.webMapResponse) {
          var handler = this.map.webMapResponse.clickEventHandle;
          var listener = this.map.webMapResponse.clickEventListener;
          if (listener && !handler) {
            this.map.webMapResponse.clickEventHandle = on(
              this.map,
              'click',
              lang.hitch(this.map, listener)
            );
          }
        }
      },

      /**
       * MEASUREMENT DISTACE TOOL CLICK
       *
       * @private
       */
      _onMeasureClick: function () {
		// uncheck the feature select button
		domClass.remove(this._featureSelectNode, 'lsgChecked');
		// set the result title
		var resultLabel = dojoQuery(".esriMeasurementResultLabel"); 
		if (resultLabel && resultLabel.length > 0) {
		  resultLabel[0].innerHTML = "Measurement Result"; 
		}
		domConstruct.empty(this._attributeNode); 
		//
		if (this.clickEvtWire) {
          this.clickEvtWire.remove();
        }
        this.clearProfileChart();
        this.map.infoWindow.clearFeatures();
        this.map.infoWindow.hide();
		this.measureTool.setTool("distance",true); //vikram
        this.emit("measure-distance-checked", {
          checked: this.measureTool._distanceButton.checked
        });
      },

      /**
       * ON MEASURE-END EVENT
       *
       * @param evt
       * @private
       */
      /*_onMeasureEnd: function (evt) {
        if (evt.toolName === 'distance') {
          this.tabContainer.selectTab(this.nls.resultslabel);
          this.lastMeasure = evt.geometry;
          this.displayProfileChart(evt.geometry);
          // UPDATE THE CHART WHEN USER CHANGES UNITS //
          aspect.after(this.measureTool.unit.dropDown, 'onItemClick', lang.hitch(this, this._updateProfileChart), true);
        }
      },*/

      _onMeasureEnd: function (evt) {
        if (evt.toolName === "distance") {
          //Todo we should really list distance for both select and measure
          console.log(number.format(evt.values) + " " + evt.unitName);
          this.tabContainer.selectTab(this.nls.resultslabel);
          this.lastMeasure = evt.geometry;
          this.displayProfileChart(evt.geometry);
        }
      },

      _bindEvents: function () {
        this.own(on(this.btnClear, 'click', lang.hitch(this, this._clear)));
        html.setStyle(this.btnClear, 'display', 'none');
        html.setStyle(this.btnInfo, 'display', 'none');
      },

      _clear: function() {
        html.setStyle(this.btnClear, 'display', 'none');
        html.setStyle(this.btnInfo, 'display', 'none');
        this.clearProfileChart();
        this.tabContainer.selectTab(this.nls.measurelabel);
        this.measureTool.clearResult();	
        return false;
      },

      /**
       * INITIALIZE THE UI
       *
       * @private
       */
      _initUI: function () {
        if (this.chartRenderingOptions.constrain) {
          domClass.add(this._chartNode, "PanelMax");
        }
        // MAKE SURE WE HAVE ACCESS TO THE PROFILE SERVICE //
        this._initProfileService().then(lang.hitch(this, function () {
          this._updateProfileChart();
          // DIJIT SUCCESSFULLY LOADED //
          this.loaded = true;
          this.emit('load', {});
        }), lang.hitch(this, function () {
          //this.emit('error', new Error(this.nls.errors.InvalidConfiguration));
		  alert(new Error(this.nls.errors.InvalidConfiguration));
          this.destroy();
        }));
      },

      /**
       * INITIALIZE THE PROFILE SERVICE
       *
       * @returns {*}
       * @private
       */
      _initProfileService: function () {
        var deferred = new Deferred();

        if (this.profileServiceUrl) {
          // MAKE SURE PROFILE SERVICE IS AVAILABLE //
          esriRequest({
            url: this.profileServiceUrl,
            content: {
              f: 'json'
            },
            callbackParamName: 'callback'
          }).then(lang.hitch(this, function (taskInfo) {
            //console.log('GP Service Details: ', taskInfo);

            // TASK DETAILS //
            this.taskInfo = taskInfo;

            // CREATE GP PROFILE SERVICE //
            this.profileService = new Geoprocessor(this.profileServiceUrl);
            this.profileService.setOutSpatialReference(this.map.spatialReference);

            // SAMPLING DISTANCE //
            this.samplingDistance = new LinearUnit();
            this.samplingDistance.units = Units.METERS;

            deferred.resolve();
          }), lang.hitch(this, function (error) {
            deferred.reject(error);
          }));
        } else {
          deferred.reject(new Error(this.nls.errors.InvalidConfiguration));
        }

        return deferred.promise;
      },
	  
	identifyFeatures: function(geom){
        this.numServicesIdent = 0;
        this.identifyResultsArray = [];
        this.iResultLen = 0;
        this.resultFound = false;
        //this.list.clear();
        //this.tabContainer.selectTab(this.nls.resultslabel);
        html.setStyle(this.progressBar.domNode, 'display', 'block');
        html.setStyle(this.divResult, 'display', 'none');

        var layers = array.map(this.map.layerIds, lang.hitch(this, function (layerId) {
          return this.map.getLayer(layerId);
        }));
		//todo consider adding back the exclude basemap option
				/*var bmlayers = array.map(this.map.basemapLayerIds, lang.hitch(this, function (layerId) {
				  return this.map.getLayer(layerId);
				}));

				console.info(bmlayers);*/
		//end comment
        var featureLayers = array.map(this.map.graphicsLayerIds, lang.hitch(this, function (layerId) {
          return this.map.getLayer(layerId);
        }));

        featureLayers = array.filter(featureLayers, lang.hitch(this, function (layer){
          if(layer.type && layer.type === 'Feature Layer' && layer.geometryType === 'esriGeometryPolyline'){
              if(this.identifylayeroption === 'visible' || this.identifylayeroption === 'top'){
                if(!layer.visible || !layer.isVisibleAtScale(this.map.getScale())){
                  return false;
                }
              }
              if(layer.version >= 10){
                if(layer.capabilities.indexOf('Query') === -1){
                  return false;
                }
              }
              if(this.isLayerNameExcluded(layer.name)){
                return false;
              }
              if(this._isFeatureLayerExcluded(layer.url)){
                return false;
              }
              this.numServicesIdent++;
              return true;
            }
          }
        ));

        layers = array.filter(layers, lang.hitch(this, function (layer) {
            if(this.identifylayeroption === 'visible' || this.identifylayeroption === 'top'){
              if(!layer.visible || !layer.isVisibleAtScale(this.map.getScale())){
                return false;
              }
            }
            if(this.isWholeServiceExcluded(layer.url)){
              return false;
            }
            if(layer.version >= 10){
              if(layer.capabilities.indexOf('Query') === -1){
                return false;
              }
            }
            this.numServicesIdent++;
            return true;
        }));

        var tasks = array.map(layers, lang.hitch(this, function (layer) {
          return new esri.tasks.IdentifyTask(layer.url);
        }));

        var tasks2 = array.map(featureLayers, lang.hitch(this, function (layer) {
          return new esri.tasks.QueryTask(layer.url);
        }));

        var FeatLyrNames = array.map(featureLayers, lang.hitch(this, function (layer) {
          return layer.name;
        }));

        var FeatLyrIds = array.map(featureLayers, lang.hitch(this, function (layer) {
          return layer.id;
        }));

        var params = this.createIdentifyParams(layers, geom);
        var params2 = this.createQueryParams(featureLayers, geom);

        var promises=[];
        //var promises2 = [];

        if (tasks.length>0)
		{
			for (var i = 0; i < tasks.length; i++) {
				promises.push(tasks[i].execute(params[i]));
			}
		}
		if (tasks2.length>0)
		{
			for (i = 0; i < tasks2.length; i++) {
			  promises.push(tasks2[i].execute(params2[i]));
			}
		}
		
		var tPromises = new all(promises);
        tPromises[0].then(lang.hitch(this, function(r){
		if (r) {
			  var firstResult; 
			  if (r.constructor === Array) {
				for (var i = 0; i < r.length; i++) { // IFG
					if (r[i].feature && r[i].feature.geometry && ("polyline" === r[i].feature.geometry.type)) { // IFG
						this.tabContainer.selectTab(this.nls.resultslabel);
						this.displayProfileChart(r[i].feature.geometry);//vikram
						firstResult = r[i]; 
						break;
					}
				}
			  } else if (r.features.constructor === Array && r.features.length > 0) {
				  this.tabContainer.selectTab(this.nls.resultslabel);
				  this.displayProfileChart(r.features[0].geometry);
				  firstResult = r; 
			  }
			  
			  /*if(r.constructor === Array){//vikram
					if (r.features.length >0){
					  this.tabContainer.selectTab(this.nls.resultslabel);
					  this.displayProfileChart(r.features[0].geometry);
					}
					else{
					  //this.tabContainer.selectTab(this.nls.resultslabel);//vikram	
					 
					 }
				}*/
			  //TODO - add attributes & highlight the line feature (the 1st one)
			  domConstruct.empty(this._attributeNode); 
			  var attrTable = domConstruct.create("table"); 
			  if (firstResult) {
				  for (var fld in firstResult.fieldAliases) {
					var row = domConstruct.create("tr"); 
					domConstruct.create("td", {
					  innerHTML: firstResult.fieldAliases[fld], 
					  class: "lsgAttributeFieldCell"
					}, row); 
					array.forEach(firstResult.features, lang.hitch(this, function(feature) {
					  domConstruct.create("td", {
						innerHTML: feature.attributes[fld],
						class: "lsgAttributeValueCell"
					  }, row);  				  
					})); 
					domConstruct.place(row, attrTable); 
				  };
			  } else {
				  var row = domConstruct.create("tr"); 
					domConstruct.create("td", {
					  innerHTML: this.nls.errors.NoFeatureSelected, 
					  class: "lsgAttributeFieldCell"
					}, row); 
				  domConstruct.place(row, attrTable); 
			  }
			  domConstruct.place(attrTable, this._attributeNode); 
		}
			  
		  }));


      },

    createIdentifyParams: function (layers, geom) {
        var identifyParamsList = [];
        array.forEach(layers, lang.hitch(this, function (layer) {
          var identifyParams = new esri.tasks.IdentifyParameters();
          identifyParams.width = this.map.width;
          identifyParams.height = this.map.height;
		  identifyParams.spatialReference = this.map.spatialReference;
          identifyParams.geometry = geom;
          identifyParams.tolerance = this.identifytolerance;
          identifyParams.mapExtent = this.map.extent;
          identifyParams.returnGeometry = this.returngeometryforzoom;
          if (this.usemaptime && this.map.timeExtent !== null){
            identifyParams.timeExtent = new TimeExtent(this.map.timeExtent.endTime, this.map.timeExtent.endTime);
          }
          if(this.identifylayeroption === 'visible'){
            identifyParams.layerOption = 'all';
          }else{
            identifyParams.layerOption = this.identifylayeroption;
          }

          var visLayers = layer.visibleLayers;
          if (visLayers && visLayers !== -1) {
            var subLayers = visLayers;
            if(subLayers.indexOf(-1) !== -1){
              subLayers.splice(subLayers.indexOf(-1), 1);
            }
            identifyParams.layerIds = this.removeGroupLayers(subLayers, layer);
          } else {
            identifyParams.layerIds = [];
          }
          identifyParamsList.push(identifyParams);
        }));
        return identifyParamsList;
      },

    removeGroupLayers: function(subLayers, layer) {
        var newSubLayers = [];
        for (var i = 0; i < subLayers.length; i++) {
          if (layer.layerInfos[subLayers[i]].subLayerIds === null){
            newSubLayers.push(subLayers[i]);
          }
        }
        return newSubLayers;
      },

    createQueryParams: function (layers, geom) {
        var queryParamsList = [];
        array.forEach(layers, lang.hitch(this, function (layer) {
          var queryParams = new esri.tasks.Query();
          queryParams.spatialRelationship = esri.tasks.Query.SPATIAL_REL_INTERSECTS;
          if(geom.type === 'point'){
            geom = this.pointToExtent(geom , this.identifytolerance);
            if (layer.geometryType === 'esriGeometryPoint') {
              queryParams.spatialRelationship = esri.tasks.Query.SPATIAL_REL_CONTAINS;
            }
          }
          queryParams.geometry = geom;
          queryParams.outFields = ['*'];
          queryParams.returnGeometry = this.returngeometryforzoom;
          queryParams.outSpatialReference = this.map.spatialReference;
          queryParamsList.push(queryParams);
        }));
        return queryParamsList;
      },
	  
	_initIdentifyTool: function (event) {
		this.clearProfileChart();
        this.map.infoWindow.clearFeatures();
        this.map.infoWindow.hide();
		this.map.graphics.clear();
		this.identifyFeatures(event.mapPoint);
	  },

	_featureClick: function (){
		  this.measureTool.setTool("distance",false);//vikram
		  this.measureTool.clearResult();
		this._displayChartLocation(-1);
		  /*array.forEach(this.map.graphics.graphics, lang.hitch(this, function (g){  
                if(g&&g.id==="chart"){  
                             //remove graphic with specific id  
                    this.map.graphics.remove(g);  
                }  
        }));*/
		if ((!(this.clickEvtWire)) || (null === this.clickEvtWire.advice)) {
			this.clickEvtWire = this.map.on("click", lang.hitch(this, this._initIdentifyTool));
		}
	  },

 	pointToExtent: function(objPoint, distance){
        var clickOffset = distance || 6;
        var centerPoint = new esri.geometry.Point(objPoint.x,objPoint.y,objPoint.spatialReference);
        var mapWidth = this.map.extent.getWidth();
        var pixelWidth = mapWidth/this.map.width;
        var tolerance = clickOffset * pixelWidth;
        var queryExtent = new esri.geometry.Extent(1,1,tolerance,tolerance,objPoint.spatialReference);
        return queryExtent.centerAt(centerPoint);
      }, 
      /**
       * GET PROFILE OVER POLYLINE FROM PROFILE SERVICE
       *
       * @param polyline
       * @returns {*}
       * @private
       */
      _getProfile: function (polyline) {
        var deferred = new Deferred();

        // CONVERT WEBMERCATOR POLYLINE TO GEOGRAPHIC        //
        // - IF NOT WEBMERCATOR ASSUME ALREADY IN GEOGRAPHIC //
        var geoPolyline = (polyline.spatialReference.isWebMercator()) ? webMercatorUtils.webMercatorToGeographic(polyline) : polyline;
        // GET LENGTH IN METERS //
        var profileLengthMeters = geodesicUtils.geodesicLengths([geoPolyline], Units.METERS)[0];
        // GET SAMPLING DISTANCE //
        var samplingDistance = (profileLengthMeters / this.samplingPointCount);

        // CREATE GP TASK INPUT FEATURE SET //
        var inputProfileGraphic = new Graphic(polyline, null, {
          OID: 1
        });
        var inputLineFeatures = new FeatureSet();
        inputLineFeatures.features = [inputProfileGraphic];
        // MAKE SURE OID FIELD IS AVAILABLE TO GP SERVICE //
        inputLineFeatures.fields = [
          {
            'name': 'OID',
            'type': 'esriFieldTypeObjectID',
            'alias': 'OID'
        }
      ];

        // MAKE GP REQUEST //
        this.profileService.execute({
          'InputLineFeatures': inputLineFeatures,
          'ProfileIDField': 'OID',
          'DEMResolution': 'FINEST',
          'MaximumSampleDistance': samplingDistance,
          'MaximumSampleDistanceUnits': 'Meters',
          'returnZ': true,
          'returnM': true
        }).then(lang.hitch(this, function (results) {

          // GET RESULT //
          if (results.length > 0) {
            var profileOutput = results[0].value;
            // GET PROFILE FEATURE //
            if (profileOutput.features.length > 0) {
              var profileFeature = profileOutput.features[0];
              // SET DEM RESOLUTION DETAILS //
              this._sourceStr = lang.replace('{0}: {1}', [this.nls.chart.demResolution, profileFeature.attributes.DEMResolution]);

              // GET PROFILE GEOMETRY //
              var profileGeometry = profileFeature.geometry;
              var allElevations = [];
              var allDistances = [];

              if (profileGeometry.paths.length > 0) {
                // POLYLINE PATHS //
                array.forEach(profileGeometry.paths, lang.hitch(this, function (profilePoints, pathIndex) {
                  // ELEVATION INFOS //
                  array.forEach(profilePoints, lang.hitch(this, function (coords, pointIndex) {
                    var elevationInfo = {
                      x: ((coords.length > 3) ? coords[3] : (pointIndex * samplingDistance)),
                      y: ((coords.length > 2) ? coords[2] : 0.0),
                      pathIdx: pathIndex,
                      pointIdx: pointIndex
                    };
                    allElevations.push(elevationInfo);
                    allDistances.push(elevationInfo.x);
                  }));
                }));

                // RESOLVE TASK //
                deferred.resolve({
                  geometry: profileGeometry,
                  elevations: allElevations,
                  distances: allDistances,
                  samplingDistance: samplingDistance
                });
              } else {
                deferred.reject(new Error(this.nls.errors.UnableToProcessResults));
              }
            } else {
              deferred.reject(new Error(this.nls.errors.UnableToProcessResults));
            }
          } else {
            deferred.reject(new Error(this.nls.errors.UnableToProcessResults));
          }
        }), deferred.reject, lang.hitch(this, function (error){
			//alert("Error Generating Elevation Profile", error.message);
			this.showMessage("Error Generating Elevation Profile" + error.message,"error");
		}));

        return deferred.promise;
      },

	_countPointsInPolyline: function (polyline) {
		var result = 0;
		try {
			for (var i = 0; i < polyline.paths.length; i++) {
				result += polyline.paths[i].length;
			}
		} catch (err) {
			result = 0;
		}
		return result;
	},

	_breakPolylineIntoPieces: function (polyline) {

		var result = [];

		try {
			if (this._maxPointCount < this._countPointsInPolyline(polyline)) {

				var newPolyline = new Polyline(polyline.spatialReference);
				var newPath = [];
				var pointCount = 0;

				for (var i = 0; i < polyline.paths.length; i++) {

					if ((this._maxPointCount >= (pointCount + polyline.paths[i].length)) && (1 > newPath.length)) {
						newPolyline.paths.push(polyline.paths[i]);
						pointCount += polyline.paths[i].length;
					} else {

						for (var j = 0; j < polyline.paths[i].length; j++) {

							if (this._maxPointCount <= pointCount) {
								if (1 < newPath.length) {
									newPolyline.paths.push(newPath);
									newPath = [];
								}
								result.push(newPolyline);
								newPolyline = new Polyline(polyline.spatialReference);
								pointCount = newPath.length;
							}

							newPath.push(polyline.paths[i][j]);
							pointCount++;
						}

						if (1 < newPath.length) { // this may sometimes (quire rarely) drop the last odd point in a polyline -- IFG 2015-10-15
							newPolyline.paths.push(newPath);
							newPath = [];
						}
					}
				}

				if (1 < this._countPointsInPolyline(newPolyline)) {
					result.push(newPolyline);
				}
			} else {
				result.push(polyline);
			}
		} catch (err) {
			result = [];
		}

		return result;
	},

	_getMultiprofile: function () {
		this._geometryArrayIndex++;
		if (this._geometryArrayIndex < this._geometryArrayToProcess.length) {
			this._getProfile(this._geometryArrayToProcess[this._geometryArrayIndex]).then(lang.hitch(this, function (elevationInfo) {
				if (0 === this._geometryArrayIndex) {
					this.elevationInfo = elevationInfo;
				} else {

					var pathOffset = this.elevationInfo.geometry.paths.length;
					var mOffset = this.elevationInfo.distances[this.elevationInfo.distances.length - 1];

					for (var i = 0; i < elevationInfo.geometry.paths.length; i++) {
						//for (var j = 0; j < elevationInfo.geometry.paths[i].length; j++) {
						//	elevationInfo.geometry.paths[i][j][3] += mOffset;
						//}
						this.elevationInfo.geometry.paths.push(elevationInfo.geometry.paths[i]);
					}

					for (var i = 0; i < elevationInfo.distances.length; i++) {
						//this.elevationInfo.distances.push(elevationInfo.distances[i] + mOffset);
						elevationInfo.distances[i] += mOffset;
						elevationInfo.elevations[i].pathIdx += pathOffset;
						elevationInfo.elevations[i].x += mOffset;
						// this.elevationInfo.elevations.push(elevationInfo.elevations[i]);
					}
					Array.prototype.push.apply(this.elevationInfo.distances, elevationInfo.distances);
					Array.prototype.push.apply(this.elevationInfo.elevations, elevationInfo.elevations);
				}
				this._getMultiprofile();
			}), lang.hitch(this, function (error) {
				html.setStyle(this.progressBar.domNode, 'display', 'none');
				this.showMessage(lang.replace('{message}\n\n{details.0}', error),"error");
				this.emit('error', error);
			}));
		} else {
			this._updateProfileChart();
			this.emit('display-profile', this.elevationInfo);
			html.setStyle(this.btnClear, 'display', 'block');
			html.setStyle(this.btnInfo, 'display', 'block');
			html.setStyle(this.progressBar.domNode, 'display', 'none');
			this._geometryArrayToProcess.length = 0;
			this._geometryArrayIndex = -1;
		}
	},


	/**
	 * DISPLAY PROFILE CHART
	 *
	 * @param geometry
	 * @returns {*}
	 */
	displayProfileChart: function (geometry) {

		html.setStyle(this.progressBar.domNode, 'display', 'block');

		//geometry = new Polyline(geometry.spatialReference);
		//geometry.paths.push([[-11900000.0,5200000.0],[-11860000.0,5200000.0]]);
		//geometry.paths.push([[-11740000.0,5200000.0],[-11720000.0,5200000.0]]);

		if (this._maxPointCount < this._countPointsInPolyline(geometry)) {
			this._geometryArrayToProcess = this._breakPolylineIntoPieces(geometry);
			this._geometryArrayIndex = -1;
			this._getMultiprofile();
		} else {
			this._getProfile(geometry).then(lang.hitch(this, function (elevationInfo) {
				// console.log(elevationInfo);
				this.elevationInfo = elevationInfo;
				this._updateProfileChart();
				this.emit('display-profile', elevationInfo);
				html.setStyle(this.btnClear, 'display', 'block');
				html.setStyle(this.btnInfo, 'display', 'block');
				html.setStyle(this.progressBar.domNode, 'display', 'none');
			}), lang.hitch(this, function (error) {
				//this._displayChartLocation(-1);
				html.setStyle(this.progressBar.domNode, 'display', 'none');
				//alert(lang.replace('{message}\n\n{details.0}', error));
				/*new Message({
					titleLabel: "Error",
					message: lang.replace('{message}\n\n{details.0}', error)
				});*/
				this.showMessage(lang.replace('{message}\n\n{details.0}', error),"error");
				this.emit('error', error);
			}));
		}
	},

      /**
       * CLEAR PROFILE CHART
       *
       * @private
       */
      clearProfileChart: function () {
        this.elevationInfo = null;
        this._updateProfileChart();
        this.emit('clear-profile', {});
      },

      /**
       * UPDATE PROFILE CHART
       *
       * @private
       */
      _updateProfileChart: function () {
        html.setStyle(this.progressBar.domNode, 'display', 'block');
        this._createProfileChart(this.elevationInfo).then(lang.hitch(this, function () {
          this.profileChart.resize();
          html.setStyle(this.progressBar.domNode, 'display', 'none');
        }), lang.hitch(this, function (error) {
          html.setStyle(this.progressBar.domNode, 'display', 'none');
          this.emit('error', error);
		  //this._displayChartLocation(-1);
        }));
      },

      _unitsChanged: function () {
        //Check to see if the measure tool is active. If so call update profile chart
        if (this.measureTool._distanceButton.checked) {
          //measure tool
          this._updateProfileChart();
        }
      },

      /**
       * CREATE PROFILE CHART
       *
       * @param elevationInfo
       * @returns {*}
       * @private
       */
      _createProfileChart: function (elevationInfo) {
        var deferred = new Deferred();

        // CHART SERIES NAMES //
        var waterDataSeriesName = 'Water';
        var elevationDataSeriesName = 'ElevationData';

        // MIN/MAX/STEP //
        var yMin = -10.0;
        var yMax = 100.0;

        // DID WE GET NEW ELEVATION INFORMATION //
        if (!elevationInfo) {

          // CLEAR GRAPHIC FROM MAP //
          this._displayChartLocation(-1);

          	// SAMPLING DISTANCE //
		if (this.samplingDistance) {
			this.samplingDistance.distance = (this.map.extent.getWidth() / this.samplingPointCount);
		}

          // GEOMETRY AND ELEVATIONS //
          this.profilePolyline = null;
		var samplingDisplayDistance = 0;
		if (this.samplingDistance) {
			samplingDisplayDistance = this._convertDistancesArray([this.samplingDistance.distance])[0];
		}
          this.elevationData = this._getFilledArray(this.samplingPointCount, samplingDisplayDistance, true);

          // CLEAR GAIN/LOSS AND SOURCE DETAILS //
          this._gainLossStr = '';
          this._sourceStr = '';

          // REMOVE ELEVATION INDICATORS //
          if (this.elevationIndicator) {
            this.elevationIndicator.destroy();
            this.elevationIndicator = null;
          }
          if (this.elevationIndicator2) {
            this.elevationIndicator2.destroy();
            this.elevationIndicator2 = null;
          }

        } else {

          // GEOMETRY, ELEVATIONS, DISTANCES AND SAMPLING DISTANCE //
          this.profilePolyline = elevationInfo.geometry;
          this.elevationData = this._convertElevationsInfoArray(elevationInfo.elevations);
          this.distances = this._convertDistancesArray(elevationInfo.distances);
          this.samplingDistance.distance = this._convertDistancesArray([elevationInfo.samplingDistance.distance])[0];

          // CALC MIN/MAX/STEP //
          var yMinSource = this._getArrayMin(this.elevationData);
          var yMaxSource = this._getArrayMax(this.elevationData);
          var yRange = (yMaxSource - yMinSource);
          yMin = yMinSource - (yRange * 0.05);
          yMax = yMaxSource + (yRange * 0.05);

          // GAIN/LOSS DETAILS //
          var detailsNumberFormat = {
            places: 0
          };
          var elevFirst = this.elevationData[0].y;
          var elevLast = this.elevationData[this.elevationData.length - 1].y;
          var gainLossDetails = {
            min: number.format(yMinSource, detailsNumberFormat),
            max: number.format(yMaxSource, detailsNumberFormat),
            start: number.format(elevFirst, detailsNumberFormat),
            end: number.format(elevLast, detailsNumberFormat),
            gainloss: number.format((elevLast - elevFirst), detailsNumberFormat)
          };
          this._gainLossStr = lang.replace(this.nls.chart.gainLossTemplate, gainLossDetails);
          //this.btnInfo.title = this._gainLossStr + "\n" + this._sourceStr;
          this.btnInfo.title = this._gainLossStr + "<br>" + this._sourceStr;

          // REMOVE ELEVATION INDICATORS //
          if (this.elevationIndicator) {
            this.elevationIndicator.destroy();
            this.elevationIndicator = null;
          }
          if (this.elevationIndicator2) {
            this.elevationIndicator2.destroy();
            this.elevationIndicator2 = null;
          }

          // MOUSE/TOUCH ELEVATION INDICATOR //
          var indicatorProperties = {
            series: elevationDataSeriesName,
            mouseOver: true,
            font: 'normal normal bold 9pt Tahoma',
            fontColor: this.chartRenderingOptions.indicatorFontColor,
            fill: this.chartRenderingOptions.indicatorFillColor,
            markerFill: 'none',
            markerStroke: {
              color: 'red',
              width: 3.0
            },
            markerSymbol: 'm -6 -6, l 12 12, m 0 -12, l -12 12', // RED X //
            offset: {
              y: -2,
              x: -25
            },
            labelFunc: lang.hitch(this, function (obj) {
              this._displayChartLocation(obj.x);
              var elevUnitsLabel = this._getDisplayUnits(true);
              var elevChangeLabel = number.format(obj.y, detailsNumberFormat);
              return lang.replace('{0} {1}', [elevChangeLabel, elevUnitsLabel]);
            })
          };
          // MOUSE/TOUCH ELEVATION CHANGE INDICATOR //
          var indicatorProperties2 = {
            series: waterDataSeriesName,
            mouseOver: true,
            font: 'normal normal bold 8pt Tahoma',
            fontColor: this.chartRenderingOptions.indicatorFontColor,
            fill: this.chartRenderingOptions.indicatorFillColor,
            fillFunc: lang.hitch(this, function (obj) {
              var elevIndex = this.distances.indexOf(obj.x);
              var elev = this.elevationData[elevIndex].y;
              return (elev >= elevFirst) ? 'green' : 'red';
            }),
            offset: {
              y: 25,
              x: -30
            },
            labelFunc: lang.hitch(this, function (obj) {
			  //this._displayChartLocation(obj.x);//vikram
              var elevIndex = this.distances.indexOf(obj.x);
              var elev = this.elevationData[elevIndex].y;
              var elevChangeLabel = number.format(elev - elevFirst, detailsNumberFormat);
              var plusMinus = ((elev - elevFirst) > 0) ? '+' : '';
              return lang.replace('{0}{1}', [plusMinus, elevChangeLabel]);
            })
          };
          if (esriSniff('has-touch')) {
            this.elevationIndicator2 = new TouchIndicator(this.profileChart, 'default', indicatorProperties2);
            this.elevationIndicator = new TouchIndicator(this.profileChart, 'default', indicatorProperties);
          } else {
            this.elevationIndicator2 = new MouseIndicator(this.profileChart, 'default', indicatorProperties2);
            this.elevationIndicator = new MouseIndicator(this.profileChart, 'default', indicatorProperties);
          }
          this.profileChart.fullRender();
        }

        // FILLED ZERO ARRAY //
        var waterData = this._resetArray(this.elevationData, 0.0);

        // ARE WE UPDATING OR CREATING THE CHART //
        if (this.profileChart != null) {

          // UPDATE CHART //
          this.profileChart.getAxis('y').opt.min = yMin;
          this.profileChart.getAxis('y').opt.max = yMax;
          this.profileChart.getAxis('y').opt.title = lang.replace(this.nls.chart.elevationTitleTemplate, [this._getDisplayUnits(true)]);
          this.profileChart.getAxis('x').opt.title = lang.replace(this.nls.chart.distanceTitleTemplate, [this._getDisplayUnits(false)]);
          this.profileChart.dirty = true;
          this.profileChart.updateSeries(waterDataSeriesName, waterData);
          this.profileChart.updateSeries(elevationDataSeriesName, this.elevationData);
          // RENDER CHART //
          this.profileChart.render();
          deferred.resolve();

        } else {

          // CREATE CHART //
          this.profileChart = new Chart(this._chartNode, {
            title: this.nls.chart.title,
            titlePos: 'top',
            titleGap: 13,
            titleFont: lang.replace('normal normal bold {chartTitleFontSize}pt verdana', this.chartRenderingOptions),
            titleFontColor: this.chartRenderingOptions.titleFontColor
          });

          // SET THEME //
          this.profileChart.setTheme(ThreeD);

          // OVERRIDE DEFAULTS //
          this.profileChart.fill = 'transparent';
          this.profileChart.theme.axis.stroke.width = 2;
          this.profileChart.theme.axis.majorTick.color = Color.named.white.concat(0.5);
          this.profileChart.theme.axis.majorTick.width = 1.0;
          this.profileChart.theme.plotarea.fill = {
            type: 'linear',
            space: 'plot',
            x1: 50,
            y1: 100,
            x2: 50,
            y2: 0,
            colors: [
              {
                offset: 0.0,
                color: this.chartRenderingOptions.skyTopColor
              },
              {
                offset: 1.0,
                color: this.chartRenderingOptions.skyBottomColor
              }
          ]
          };

          // Y AXIS //
          this.profileChart.addAxis('y', {
            min: yMin,
            max: yMax,
            fontColor: this.chartRenderingOptions.axisFontColor,
            font: lang.replace('normal normal bold {axisLabelFontSize}pt verdana', this.chartRenderingOptions),
            vertical: true,
            natural: true,
            fixed: true,
            includeZero: false,
            majorLabels: true,
            minorLabels: true,
            majorTicks: true,
            minorTicks: true,
            majorTick: {
              color: this.chartRenderingOptions.axisMajorTickColor,
              length: 6
            },
            title: lang.replace(this.nls.chart.elevationTitleTemplate, [this._getDisplayUnits(true)]),
            titleGap: 30,
            titleFont: lang.replace('normal normal bold {axisTitleFontSize}pt verdana', this.chartRenderingOptions),
            titleFontColor: this.chartRenderingOptions.titleFontColor,
            titleOrientation: 'axis'
          });

          // X AXIS //
          this.profileChart.addAxis('x', {
            fontColor: this.chartRenderingOptions.axisFontColor,
            font: lang.replace('normal normal bold {axisLabelFontSize}pt verdana', this.chartRenderingOptions),
            natural: true,
            fixed: true,
            includeZero: false,
            majorLabels: true,
            minorLabels: true,
            majorTicks: true,
            minorTicks: true,
            majorTick: {
              color: this.chartRenderingOptions.axisMajorTickColor,
              length: 6
            },
            title: lang.replace(this.nls.chart.distanceTitleTemplate, [this._getDisplayUnits(false)]),
            titleGap: 5,
            titleFont: lang.replace('normal normal bold {axisTitleFontSize}pt verdana', this.chartRenderingOptions),
            titleFontColor: this.chartRenderingOptions.titleFontColor,
            titleOrientation: 'away'
          });

          // GRID //
          this.profileChart.addPlot('grid', {
            type: Grid,
            hMajorLines: true,
            hMinorLines: false,
            vMajorLines: false,
            vMinorLines: false
          });

          // PROFIlE PLOT //
          this.profileChart.addPlot('default', {
            type: Areas,
            tension: 'X'
          });

          // WATER PLOT //
          this.profileChart.addPlot('water', {
            type: Areas
          });

          // WATER DATA //
          this.profileChart.addSeries(waterDataSeriesName, waterData, {
            plot: 'water',
            stroke: {
              width: 2.0,
              color: this.chartRenderingOptions.waterLineColor
            },
            fill: {
              type: 'linear',
              space: 'plot',
              x1: 50,
              y1: 0,
              x2: 50,
              y2: 100,
              colors: [
                {
                  offset: 0.0,
                  color: this.chartRenderingOptions.waterTopColor
                },
                {
                  offset: 1.0,
                  color: this.chartRenderingOptions.waterBottomColor
                }
            ]
            }
          });

          // PROFILE DATA //
          this.profileChart.addSeries(elevationDataSeriesName, this.elevationData, {
            plot: 'default',
            stroke: {
              width: 1.5,
              color: this.chartRenderingOptions.elevationLineColor
            },
            fill: {
              type: 'linear',
              space: 'plot',
              x1: 50,
              y1: 0,
              x2: 50,
              y2: 100,
              colors: [
                {
                  offset: 0.0,
                  color: this.chartRenderingOptions.elevationTopColor
                },
                {
                  offset: 1.0,
                  color: this.chartRenderingOptions.elevationBottomColor
                }
            ]
            }
          });

          // RENDER CHART //
          this.profileChart.render();
          deferred.resolve();
        }

        return deferred.promise;
	  
      },

      /**
       * RESIZE PROFILE CHART
       *
       * @private
       */
      _resizeChart: function () {
        if (this.profileChart) {
          this.profileChart.resize();
        }
      },

      /**
       * DISPLAY CHART LOCATION AS RED X GRAPHIC ON MAP
       *
       * @param {Number} chartObjectX
       */
      _displayChartLocation: function (chartObjectX) {
        if (this.map && this.elevationData && this.profilePolyline) {
			var exists = false;
			array.forEach(this.map.graphics.graphics, lang.hitch(this, function (g){  
                if(g&&g.id==="chart"){    
                    exists = true;
                }  
			}));
		
          if (!exists) {//(!this.chartLocationGraphic)
            // CREATE LOCATION GRAPHIC //
            var red = new Color(Color.named.red);
            var outline = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, red, 3);
            var chartLocationSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_X, 13, outline, red);
            this.chartLocationGraphic = new Graphic(null, chartLocationSymbol); // RED X //
			this.chartLocationGraphic.id = "chart";
            this.map.graphics.add(this.chartLocationGraphic);
          }

          // SET GEOMETRY OF LOCATION GRAPHIC //
          var distanceIndex = (this.distances) ? array.indexOf(this.distances, chartObjectX) : -1;
          if (distanceIndex >= 0) {
            var elevData = this.elevationData[distanceIndex];
			try{
            this.chartLocationGraphic.setGeometry(this.profilePolyline.getPoint(elevData.pathIdx, elevData.pointIdx));
			} 
			catch (err){
				console.log(err);
			}
			
          } else {
            this.chartLocationGraphic.setGeometry(null);
          }
        }
      },

      /**
       * GET DISPLAY VALUE GIVEN A VALUE IN METERS AND THE DISPLAY UNITS
       * CONVERT FROM METERS TO MILES THEN FROM MILES TO DISPLAY UNITS
       *
       * @param {Number} valueMeters
       * @param {String} displayUnits
       */
      _getDisplayValue: function (valueMeters, displayUnits) {
        if (displayUnits === this.measureTool._unitStrings.esriMeters) {
          return valueMeters;
        } else {
          var distanceMiles = (valueMeters / this.measureTool._unitDictionary[this.measureTool._unitStrings.esriMeters]);
          return (distanceMiles * this.measureTool._unitDictionary[displayUnits]);
        }
      },

      /**
       * GET DISPLAY UNITS
       *
       * @param {Boolean} isElevation
       */
      _getDisplayUnits: function (isElevation) {
        var displayUnits = this.measureTool._unitDropDown.label;
        if (isElevation) {
          switch (displayUnits) {
          case this.measureTool._unitStrings.esriMiles:
            displayUnits = this.measureTool._unitStrings.esriFeet;
            break;
          case this.measureTool.esriYards:
            displayUnits = this.measureTool.esriFeet;
            break;
          case this.measureTool._unitStrings.esriKilometers:
            displayUnits = this.measureTool._unitStrings.esriMeters;
            break;
          }
        }
        return displayUnits;
      },

      /**
       * CONVERT ELEVATION INFO (X=DISTANCE,Y=ELEVATION) FROM METERS TO DISPLAY UNITS
       *
       * @param elevationArray
       * @returns {Array}
       * @private
       */
      _convertElevationsInfoArray: function (elevationArray) {
        var displayUnitsX = this._getDisplayUnits(false);
        var displayUnitsY = this._getDisplayUnits(true);
        return array.map(elevationArray, lang.hitch(this, function (item) {
          return lang.mixin(item, {
            x: this._getDisplayValue(item.x, displayUnitsX),
            y: this._getDisplayValue(item.y, displayUnitsY)
          });
        }));
      },

      /**
       * CONVERT DISTANCES FROM METERS TO DISPLAY UNITS
       *
       * @param distancesArray
       * @returns {Array}
       * @private
       */
      _convertDistancesArray: function (distancesArray) {
        var displayUnitsX = this._getDisplayUnits(false);
        return array.map(distancesArray, lang.hitch(this, function (distance) {
          return this._getDisplayValue(distance, displayUnitsX);
        }));
      },

      /**
       * CREATE ARRAY WITH INPUT VALUE AND ALLOW MULTIPLIER
       *
       * @param size
       * @param value
       * @param asMultiplier
       * @returns {Array}
       * @private
       */
      _getFilledArray: function (size, value, asMultiplier) {
        var dataArray = new Array(size);
        for (var dataIdx = 0; dataIdx < size; ++dataIdx) {
          dataArray[dataIdx] = {
            x: asMultiplier ? (dataIdx * value) : dataIdx,
            y: asMultiplier ? 0.0 : (value || 0.0)
          };
        }
        return dataArray;
      },

      /**
       * RESET Y VALUES IN ARRAY
       *
       * @param dataArray
       * @param value
       * @returns {*}
       * @private
       */
      _resetArray: function (dataArray, value) {
        return array.map(dataArray, function (item) {
          return {
            x: item.x,
            y: value
          };
        });
      },

      /**
       * GET MAXIMUM Y VALUE IN ARRAY
       *
       * @param {[]} dataArray
       * @return {number}
       * @private
       */
      _getArrayMax: function (dataArray) {
        var values = array.map(dataArray, function (item) {
          return item.y;
        });
        return Math.max.apply(Math, values);
      },

      /**
       * GET MINIMUM Y VALUE IN ARRAY
       *
       * @param {[]} dataArray
       * @return {number}
       * @private
       */
      _getArrayMin: function (dataArray) {
        var values = array.map(dataArray, function (item) {
          return item.y;
        });
        return Math.min.apply(Math, values);
      },

      /**
       * DESTROY DIJIT
       */
      destroy: function () {
        if (this.profileChart) {
          this.profileChart.destroy();
        }
        this.inherited(arguments);
      },
	  
	  isWholeServiceExcluded: function (serviceUrl) {
        var eURL = '';
		if (serviceUrl) {
			serviceUrl = serviceUrl.toUpperCase(); 
			for (var el = 0; el < this.excludeLayers.length; el++) {
			  eURL = this.excludeLayers[el].url;
			  if (eURL) { 
				eURL = eURL.toUpperCase(); 
				if (eURL.startsWith("HTTP") === true) {
				  if (serviceUrl === eURL) {
					return true; 
				  }
				} else {
					// when the protocol omitted, exclude both HTTP and HTTPS
					serviceUrl = serviceUrl.replace("HTTP:", "").replace("HTTPS:", ""); 
					if (serviceUrl === eURL) {
					  return true; 
					}
				}
			  }
			}
		}
        return false;
      },

      isLayerNameExcluded: function (layerName) {
        var eName = '';
        for (var el = 0; el < this.excludeLayers.length; el++) {
          eName = this.excludeLayers[el].name;
          if(layerName && eName && layerName.toUpperCase() === eName.toUpperCase()){
            return true;
          }
        }
        return false;
      },
	  _isResultLayerExcluded: function (identifyResult, serviceUrl) {
        var eName = '';
        var eURL = '';
        var eId = -1;
        for (var el = 0; el < this.excludeLayers.length; el++) {
          eName = this.excludeLayers[el].name;
          eURL = this.excludeLayers[el].url;
          eId = this.excludeLayers[el].id;
          if(eName && identifyResult.layerName === eName){
            return true;
          }
          if(serviceUrl && eURL && eId && serviceUrl.toUpperCase() === eURL.toUpperCase() && identifyResult.layerId === eId){
            return true;
          }
          if(serviceUrl && eURL && !eId && serviceUrl.toUpperCase() === eURL.toUpperCase()){
            return true;
          }
        }
        return false;
      },

      _isFeatureLayerExcluded: function (serviceUrl) {
        var eURL = '';
        var eId = -1;
        var efUrl = '';
        for (var el = 0; el < this.excludeLayers.length; el++) {
          eURL = this.excludeLayers[el].url;
          eId = this.excludeLayers[el].id;
          if (!eURL) {continue;}
          efUrl = (eURL.substr(-1) === '/') ? eURL.toUpperCase() + eId : eURL.toUpperCase() + '/' + eId;
          if(serviceUrl && eURL && eId && serviceUrl.toUpperCase() === efUrl){
            return true;
          }
        }
        return false;
      }
    });
  });
