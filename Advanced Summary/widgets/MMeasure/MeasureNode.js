///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
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
  'dojo/_base/lang',
  'dojo/_base/array', 
  'dojo/dom-construct',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dojo/on',
  'dojo/query',
  'jimu/utils',
  'dojo/mouse'
],
function (declare, lang, array, domConstruct, _WidgetBase, _TemplatedMixin, on, query, utils) {
  return declare([_WidgetBase, _TemplatedMixin], {
    templateString: '<table class="lsg-measure-node"></table>', 
    /**
    *options:
    * - measurePoints as array
	* -- each item consists of name, x, y, m
    **/
    constructor: function(options, dom){
      /*jshint unused: false*/
	  this.precision = options.precision || 10000; 
    },
    postCreate: function () {
	  if (this.measurePoints.mode == 'line') {
	    array.forEach(this.measurePoints.points, lang.hitch(this, function(item, i) {
		  var measureNode = this._createMeasurePointNode(item, i);
		  domConstruct.place(measureNode, this.domNode); 
	    }));
	  } else if (this.measurePoints.mode == 'point') {
	    array.forEach([this.measurePoints.points[0]], lang.hitch(this, function(item, i) {
		  var measureNode = this._createMeasurePointNode(item, i);
		  domConstruct.place(measureNode, this.domNode); 
	    })); 
	  }

      this.own(on(this.domNode, 'click', lang.hitch(this, this.onClick)));
	  this.own(on(this.domNode, 'mouseover', lang.hitch(this, this.highLight))); 
	  this.own(on(this.domNode, 'mouseout', lang.hitch(this, this.unhighLight))); 
    },
	
	_roundToPrecision: function(n) {
	  return Math.round(n * this.precision) / this.precision;
	}, 
	
	_createMeasurePointNode: function(measurePt, idx) {
	  var measureNode = domConstruct.create('tr'); 
	  if (measurePt.name) {
		if (this.measurePoints.mode == 'line') {
	      var header = domConstruct.create('td', {
		    'innerHTML': utils.sanitizeHTML(measurePt.name), 
		    'class': (idx%2==0?'measure-header-start':'measure-header-end')
	      }, measureNode); 
		} else if (this.measurePoints.mode == 'point') {
	      var header = domConstruct.create('td', {
		    'innerHTML': utils.sanitizeHTML(measurePt.name), 
		    'class': 'measure-header-single'
	      }, measureNode); 
		}
	  }
	  var xyCell = domConstruct.create('td', {
		'class': 'measure-point-label'
	  }, measureNode); 
	  var xLabel = domConstruct.create('div', {
		'innerHTML': measurePt.xLabel + " " + this._roundToPrecision(measurePt.x), 
		'class': 'measure-coordinate-value'
	  }, xyCell); 
	  var yLabel = domConstruct.create('div', {
		'innerHTML': measurePt.yLabel + " " + this._roundToPrecision(measurePt.y),  
		'class': 'measure-coordinate-value'
	  }, xyCell);
	  var mCell = domConstruct.create('td', {
		'class': 'measure-point-label'
	  }, measureNode); 
	  if (!measurePt.m || measurePt.m == 0) {
	    var mLabel = domConstruct.create('div', {
		  'innerHTML': '', 
		  'class': 'measure-value-label'
	    }, mCell); 
	    var mValue = domConstruct.create('div', {
		  'innerHTML': '-', 
		  'class': 'measure-value'
	    }, mCell); 		  
	  } else {
	    var mLabel = domConstruct.create('div', {
		  'innerHTML': measurePt.mLabel, 
		  'class': 'measure-value-label'
	    }, mCell); 
	    var mValue = domConstruct.create('div', {
		  'innerHTML': this._roundToPrecision(measurePt.m), 
		  'class': 'measure-value'
	    }, mCell); 
	  }
	  return measureNode; 
	}, 

    onClick: function(){
      query('.lsg-measure-node', this.getParent().domNode).removeClass('jimu-state-selected');
      query(this.domNode).addClass('lsg-state-selected');
    },

    highLight: function(){
      query('.lsg-measure-node', this.getParent().domNode).removeClass('jimu-state-selected');
      query(this.domNode).addClass('lsg-state-selected');
	},
	
	unhighLight: function() {
      query('.lsg-measure-node', this.getParent().domNode).addClass('jimu-state-selected');
      query(this.domNode).removeClass('lsg-state-selected');
	}, 

    startup: function(){

    }

  });
});
