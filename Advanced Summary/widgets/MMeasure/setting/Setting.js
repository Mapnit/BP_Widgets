///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2016 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/html',
    'dojo/_base/lang',
    'dojo/dom-style',
    'dojo/on',
    'dojo/query',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/form/Select',
	'dijit/form/TextBox', 
    'dijit/form/ValidationTextBox',
    'jimu/BaseWidgetSetting',
    'jimu/dijit/Message',
    'jimu/dijit/SimpleTable'
  ],
  function(
    declare, array, html, lang,
    domStyle, on, query,
    _WidgetsInTemplateMixin,
    Select, TextBox, ValidationTextBox,
    BaseWidgetSetting, Message) {

    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      //these two properties is defined in the BaseWidget
      baseClass: 'lsg-widget-mmeasure-setting',

      mLayers: null,
	  mLayerOptions: [], 

      postCreate: function() {
        this.inherited(arguments);
		
		this.own(on(this.btnAddMLayer, 'click', lang.hitch(this, this._addMLayerTableRow))); 
		this.own(on(this.mLayerTable, 'row-delete', lang.hitch(this, function(tr) {
          if (tr.select) {
            tr.select.destroy();
            delete tr.select;
          }
        })));		

		this._setMLayerOptions(); 
		
        this.setConfig(this.config);
      },

      // initialize widget configuration panel with current config data
      setConfig: function(config) {
        this.config = config;
		
		this._populateMLayerTable(); 
      },
	  
	  _setMLayerOptions: function() {
		var opLayers = this.map.itemInfo.itemData.operationalLayers;
		this.mLayerOptions = []; 
		
        if (opLayers && opLayers.length === 0) {
          new Message({
            message: this.nls.missingLayerInWebMap
          });
          return;
        } 

        array.forEach(opLayers, lang.hitch(this, function(opLayer) {
          //if (opLayer.layerObject) {
          if (opLayer.layerType === "ArcGISFeatureLayer") {
            if (opLayer.featureCollection) {
              for (var i = 0; i < opLayer.featureCollection.layers.length; i++) {
                var lyr = opLayer.featureCollection.layers[i].layerObject;
                var lbl = opLayer.title;
                if (i > 0) {
                  lbl += ": " + i;
                }
                this.mLayerOptions.push({
                  label: lbl, //opLayer.layerObject.name,
                  value: lyr.id
                });
              }
            } else if (opLayer.layerObject) {
              this.mLayerOptions.push({
                label: opLayer.title, //opLayer.layerObject.name,
                value: opLayer.id
              });
            }
          }
          //}
        }));
		
	  }, 

      _populateMLayerTable: function() {
        this.mLayerTable.clear();
        if (this.config.mLayers) {
          array.forEach(this.config.mLayers, lang.hitch(this, function(mLayerInfo) {
            this._populateMLayerTableRow(mLayerInfo);
          }));
        }
      },

      _populateMLayerTableRow: function(mLayerInfo) {
        var result = this.mLayerTable.addRow({});
        if (result.success && result.tr) {
          var tr = result.tr;
          this._addLayerNames(tr);
          this._addDataSource(tr);
          tr.mLayerSelect.set("value", mLayerInfo.layerName);
          tr.dataSourceInput.set("value", mLayerInfo.dataSource);
        }
      },

      _addMLayerTableRow: function() {
        var result = this.mLayerTable.addRow({});
        if (result.success && result.tr) {
          var tr = result.tr;
          this._addLayerNames(tr);
          this._addDataSource(tr);
        }
      },

      _addLayerNames: function(tr) {
        var mLayerOptions = lang.clone(this.mLayerOptions);
        var td = query('.simple-table-cell', tr)[0];
        html.setStyle(td, "verticalAlign", "middle");
        var mLayerSelect = new Select({
          style: {
            width: "100%",
            height: "30px"
          },
          options: mLayerOptions
        });
        mLayerSelect.placeAt(td);
        mLayerSelect.startup();
        tr.mLayerSelect = mLayerSelect;
      },

      _addDataSource: function(tr) {
        var td = query('.simple-table-cell', tr)[1];
        html.setStyle(td, "verticalAlign", "middle");
        var dataSourceInput = new ValidationTextBox({
          style: {
            width: "100%",
            height: "30px"
          }
        });
        dataSourceInput.placeAt(td);
        dataSourceInput.startup();
        tr.dataSourceInput = dataSourceInput;
      },

      // return updated widget config to builder
      getConfig: function() {

        var trs = this.mLayerTable.getRows();
        var mLayers = [];
		
        array.forEach(trs, lang.hitch(this, function(tr) {
          var mLayerSelect = tr.mLayerSelect;
          var dataSourceInput = tr.dataSourceInput;
          mLayers.push({
            layerName: mLayerSelect.value, 
            dataSource: dataSourceInput.value
          });
        }));
		
        this.config.mLayers = mLayers;

        return this.config;
      }

    });
  });
