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
    },
    postCreate: function () {
		
	  array.forEach(this.measurePoints, lang.hitch(this, function(item) {
		var measureNode = this._createMeasurePointNode(item);
		domConstruct.place(measureNode, this.domNode); 
	  })); 

      this.own(on(this.domNode, 'click', lang.hitch(this, this.onClick)));
	  this.own(on(this.domNode, 'mouseover', lang.hitch(this, this.highLight))); 
	  this.own(on(this.domNode, 'mouseout', lang.hitch(this, this.unhighLight))); 
    },
	
	_createMeasurePointNode: function(measurePt) {
	  var measureNode = domConstruct.create('tr'); 
	  if (measurePt.name) {
	    var header = domConstruct.create('td', {
		  'innerHTML': utils.sanitizeHTML(measurePt.name), 
		  'class': 'measure-header'
	    }, measureNode); 
	  }
	  var xyCell = domConstruct.create('td', {
		'class': 'measure-point-label'
	  }, measureNode); 
	  var xLabel = domConstruct.create('div', {
		'innerHTML': measurePt.xLabel + " " + measurePt.x, 
		'class': 'measure-coordinate-value'
	  }, xyCell); 
	  var yLabel = domConstruct.create('div', {
		'innerHTML': measurePt.yLabel + " " + measurePt.y, 
		'class': 'measure-coordinate-value'
	  }, xyCell);
	  var mCell = domConstruct.create('td', {
		'class': 'measure-point-label'
	  }, measureNode); 
	  var mLabel = domConstruct.create('div', {
		'innerHTML': measurePt.mLabel, 
		'class': 'measure-value-label'
	  }, mCell); 
	  var mValue = domConstruct.create('div', {
		'innerHTML': measurePt.m, 
		'class': 'measure-value'
	  }, mCell); 
	  
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