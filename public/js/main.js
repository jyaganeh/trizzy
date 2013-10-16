var dl;

(function($) {

  function DeviceLocations() {

    this.tileLayerURL = 'http://mapattack-tiles-0.pdx.esri.com/dark/{z}/{y}/{x}';
    this.apiUrl = 'https://geotrigger.arcgis.com/device/locations';
    $('#apiUrl').val(this.apiUrl);

    this.map = L.map('map');

    this.tiles = new L.tileLayer(this.tileLayerURL);
    this.map.addLayer(this.tiles);
    this.map.setView([35.5, -100], 4);

    this.createLayers();

    this.locationsMapper = new LocationsMapper(this, 0);
  }

  DeviceLocations.prototype.createLayers = function() {
    this.createLocationsLayer();
  };

  DeviceLocations.prototype.createLocationsLayer = function() {
    if (this.locLayer != null) { this.map.removeLayer(this.locLayer); }
    this.locLayer = L.geoJson(null, {
      style: {
        color: "#4978F3"
      }
    }).addTo(this.map);
    this.markerLayer = L.geoJson(null, {
        style: {

        }
    })
  };

  DeviceLocations.prototype.get = function() {

    var data = $('form').serializeArray();
    var at;

    var params = {};
    $(data).each($.proxy(function(i,e) {
      switch (e.name) {
        case "access_token":
          at = e.value;
          // params['token'] = at;
          break;
        case "apiUrl":
          this.apiUrl = e.value;
          break;
        default:
          if (e.value) { params[e.name] = e.value; }
      }
    }, this));

    var headers = {
      "Authorization": "Bearer " + at,
      "Loqization": "e0af7131723bea614df2bff9527dc4f5350d0c6dbca067a455529778d6578240"
    };

    $('.submit button').attr("disabled", true);
    $('#response').val("waiting...");

    $.ajax({
      method: "POST",
      contentType: "application/json",
      dataType: 'json',
      url: this.apiUrl,
      data: JSON.stringify(params),
      processData: false,
      headers: headers
    }).done($.proxy(this.handleGetResponse, this));

  };

  DeviceLocations.prototype.handleGetResponse = function(r) {

    $('.submit button').attr("disabled", null);

    $('#response').val(JSON.stringify(r, null, 2));

    if (!r.error) {
      this.locationsMapper.setLocations(r.locations);
      this.locationsMapper.show();

      if (r.boundingBox) {
        cs = r.boundingBox.coordinates[0];
        var sw = new L.LatLng(cs[0][1], cs[0][0]);
        var ne = new L.LatLng(cs[2][1], cs[2][0]);
        var bounds = new L.LatLngBounds(sw, ne);
        this.map.fitBounds(bounds);
      }
    }

  };
  
  // ---

  function LocationsMapper(dl, timeout) {
    this.setLocations([]);
    this.timeout = timeout || 25;
    this.dl = dl;
  };

  LocationsMapper.prototype.setLocations = function(ls) {
    this.locations = ls.slice(0);
    this._locations = ls.slice(0);
  };

  LocationsMapper.prototype.show = function() {
    var coordinates = [];
    while (this._locations.length > 0) {
      var l = this._locations.pop();
        console.log(l);
        var xmin = Infinity;
        var xmax = -Infinity;
        var ymin = Infinity;
        var ymax = -Infinity;

        for (var i = 0; i < l.geometry.coordinates[0].length; i++) {
            var c = l.geometry.coordinates[0][i];
            var x = c[1];
            var y = c[0]
            if (y > ymax) ymax = y;
            if (y < ymin) ymin = y;
            if (x > xmax) xmax = x;
            if (x < xmin) xmin = x;
        }

        var x = ((xmax - xmin) / 2) + xmin;
        var y = ((ymax - ymin) / 2) + ymin;

        coordinates.push([y, x]);

//      setTimeout($.proxy(function(){ this.show(); }, this), this.timeout);
    }

    var feature = {
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: coordinates
        }
    }

    this.dl.locLayer.addData(feature);
  };

  LocationsMapper.prototype.resetLocations = function(timeout) {
    this.setLocations(this.locations);
    this.timeout = timeout || 25;
  };
  
  function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  $(function() {

    dl = new DeviceLocations();

    $('#submit').on('click', function(e) {
      e.preventDefault();
      dl.get();
    });

    $('#clear').on('click', function(e) {
      e.preventDefault();
      dl.createLayers();
    });

    $('#redraw').on('click', function(e) {
      e.preventDefault();
      dl.createLocationsLayer();
      dl.locationsMapper.resetLocations(250);
      dl.locationsMapper.show();
    });

    $("#fromTimestamp").datetimepicker({
      changeMonth: true,
      dateFormat: 'yy-mm-dd',
      onClose: function(selected) {
        $("#toTimestamp").datetimepicker("option", "minDateTime", new Date(Date.parse(selected)));
      }
    });

    $("#toTimestamp").datetimepicker({
      changeMonth: true,
      dateFormat: 'yy-mm-dd',
      onClose: function(selected) {
        $("#fromTimestamp").datetimepicker("option", "maxDateTime", new Date(Date.parse(selected)));
      }
    });

    var at = getParameterByName('access_token');
    if (at != null && at != '') { $('#access_token').val(at); }

    var did = getParameterByName('deviceId');
    if (did != null && did != '') { $('#deviceId').val(did); }

    var host = getParameterByName('host');
    if (host != null && host != '') {
      dl.apiUrl = 'http://' + host + '/device/locations';
      $('#apiUrl').val(dl.apiUrl);
    }

  });


})(jQuery);
