define({
  root: ({
	selectToolUsage: "Select the Measure tool or the Select tool", 
    measurementUsage: "Use the Measure tool to draw a line on the map that you want to see the elevation profile for.",
	selectFeatureUsage: "Use the Select tool to select a line feature on the map that you want to see the elevation profile for.",
    chartLabel: "Hover over or touch the Elevations Profile chart to display elevations and show location on map.",
    clear: "Clear",
    measurelabel: "Measure",
    resultslabel: "Profile Result",
    profileinfo: "Profile Information",
    display: {
      elevationProfileTitle: "Elevation Profile",
      hoverOver: "Hover over or touch the Elevations Profile chart to display elevations and show location on map."
    },
    chart: {
      title: "",
      demResolution: "DEM Resolution",
      elevationTitleTemplate: "Elevation in {0}",
      distanceTitleTemplate: "Distance in {0}",
      gainLossTemplate: "Min: {min} Max: {max}<br>Start: {start} End: {end}<br>Change: {gainloss}"
    },
    errors: {
      InvalidConfiguration: "Invalid configuration.",
      UnableToProcessResults: "Unable to process analysis results.", 
	  NoFeatureSelected: "No feature selected"
    },
    widgetversion: 'Elevation Profile Widget Version Info',
    widgetverstr: 'Widget Version',
    wabversionmsg: 'Widget is designed to run in Web AppBuilder version'
  })
});
