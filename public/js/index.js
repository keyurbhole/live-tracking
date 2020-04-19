/* eslint-disable no-unused-vars, no-shadow-global */
/* globals google firebase */

// Global Variables
var isDirectionApiUsed = true, destinationLocation;
var map, destinationMarker, deliveryPersonMarker, deliveryToDestPolyline;
var destLat, destLng, directionsService, directionsRenderer;

function generateMarker({ position, icon, title }) {
  return new google.maps.Marker({
    position, icon, title, map,
    animation: google.maps.Animation.DROP,
  });
}

function drawPolyline({ directionResult }) {
  return new google.maps.Polyline({
    path: google.maps.geometry.encoding.decodePath(directionResult.routes[0].overview_polyline),
    geodesic: true, strokeColor: '#00bcd4', strokeOpacity: 1.0, strokeWeight: 2, map
  });
}

// Map Initialize
function initMap() {
  // You can pass the destination lat and lng in query params
  // In this example I will hardcode the value
  destLat = 18.590879;
  destLng = 73.753157;
  destinationLocation = new google.maps.LatLng(destLat, destLng);
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: destinationLocation
  });

  // Set Destination Marker
  destinationMarker = generateMarker({ position: destinationLocation, icon: '/images/dashboard/placemarker_red.png', title: 'Destination' })

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: true, map,
    polylineOptions: {
      strokeColor: "#79a1ee",
      strokeOpacity: 1.0,
      strokeWeight: 5
    }
  });

  // Initialize Firebase Database
  const db = firebase.database();

  // ref can be any of your node name
  // In my example I will be using locations as node name
  db.ref('locations').on('value', snapshot => {
    let dataSnapshot = snapshot.val();
    // Before calling onLocationChange function 
    // you can have some logic fetching the particular node 
    // in which latitude and longitude data is stored.
    // In this example we will be passing the snapshot value directly
    onLocationChange(dataSnapshot);
  });
}

function onLocationChange(dataSnapshot) {
  if (deliveryPersonMarker) {
    previousLat = deliveryPersonMarker.position.lat();
    previousLng = deliveryPersonMarker.position.lng();
  }
  nextLat = dataSnapshot.latitude
  nextLng = dataSnapshot.longitude
  // Direction API shoud be used once
  if (isDirectionApiUsed) {
    let start = new google.maps.LatLng(parseFloat(dataSnapshot.latitude), parseFloat(dataSnapshot.longitude));
    // Calculate and display Route
    calculateRoute({ start, end: destinationLocation })
  }
  if (deliveryPersonMarker) {
    // Update Delivery Person Marker using animation
    animateMarkerNavigation({ current: { lat: deliveryPersonMarker.position.lat(), lng: deliveryPersonMarker.position.lng() }, next: { lat: parseFloat(dataSnapshot.latitude), lng: parseFloat(dataSnapshot.longitude) } })
  } else {
    // Set Delivery Person Marker on First Change
    deliveryPersonMarker = generateMarker({
      position: { lat: parseFloat(dataSnapshot.latitude), lng: parseFloat(dataSnapshot.longitude) },
      icon: '/images/dashboard/placemarker_blue.png', title: 'Delivery Person'
    })
  }
}

function calculateRoute({ start, end }) {
  var request = {
    origin: start,
    destination: end,
    travelMode: 'DRIVING'
  };
  directionsService.route(request, function (result, status) {
    if (status == 'OK') {
      // directionsRenderer.setDirections(result);
      isDirectionApiUsed = false
      deliveryToDestPolyline = drawPolyline({ directionResult: result })
    }
  });
}

// move marker from current to next position in 0.5 seconds
function animateMarkerNavigation({ current, next }) {
  var deltalat = (next.lat - current.lat) / 100;
  var deltalng = (next.lng - current.lng) / 100;

  var delay = 10 * 0.5;
  for (var i = 0; i < 100; i++) {
    (function (ind) {
      setTimeout(
        function () {
          var lat = deliveryPersonMarker.position.lat();
          var lng = deliveryPersonMarker.position.lng();
          lat += deltalat;
          lng += deltalng;
          latlng = new google.maps.LatLng(lat, lng);
          deliveryPersonMarker.setPosition(latlng);
        }, delay * ind
      );
    })(i)
  }
}
