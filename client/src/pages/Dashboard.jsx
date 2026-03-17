import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import socket from '../services/socket';
import { updateLocation } from '../redux/locationSlice';
import { fetchGeofences, createGeofence } from '../redux/geofenceSlice';
import { Loader2, Navigation, Users, Map as MapIcon, AlertCircle, Radius, Plus, BellRing, Share2 } from 'lucide-react';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom component to update map view
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const { groups } = useSelector((state) => state.groups);
  const { isInvisible } = useSelector((state) => state.location);
  
  const [myLocation, setMyLocation] = useState(null);
  const [membersLocations, setMembersLocations] = useState({});
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default to India center
  const [zoom, setZoom] = useState(5);
  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newFenceName, setNewFenceName] = useState('');
  const [newFenceRadius, setNewFenceRadius] = useState(100);
  const [notifications, setNotifications] = useState([]);

  const { fences } = useSelector((state) => state.geofences);

  const watchId = useRef(null);
  const persistenceInterval = useRef(null);
  const dispatch = useDispatch();
  const latestLocation = useRef(null);

  useEffect(() => {
    latestLocation.current = myLocation;
  }, [myLocation]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    setLocationError(null);
    setIsLocating(true);

    if (watchId.current) navigator.geolocation.clearWatch(watchId.current);

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const newLoc = { lat: latitude, lng: longitude, accuracy };
        setMyLocation(newLoc);
        setIsLocating(false);
        
        // Initial center on user
        setMapCenter(prev => {
          if (prev[0] === 20.5937 && prev[1] === 78.9629) {
            setZoom(15);
            return [latitude, longitude];
          }
          return prev;
        });

        // Broadcast to all groups user belongs to (only if NOT invisible)
        if (groups && groups.length > 0 && !isInvisible) {
          groups.forEach(group => {
            socket.emit('update-location', {
              userId: user.user.id,
              userName: user.user.name,
              lat: latitude,
              lng: longitude,
              groupId: group._id
            });
          });
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        let msg = 'Unknown location error';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Location permission denied. Please enable it in browser settings (click the lock icon in URL bar).';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Location information is unavailable on this device.';
            break;
          case error.TIMEOUT:
            msg = 'Location request timed out. Trying again...';
            break;
        }
        setLocationError(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
  };

  useEffect(() => {
    socket.connect();

    persistenceInterval.current = setInterval(() => {
      if (latestLocation.current && !isInvisible) {
        dispatch(updateLocation(latestLocation.current));
      }
    }, 60000);

    if (groups && groups.length > 0) {
      const groupIds = groups.map(g => g._id);
      socket.emit('join-groups', groupIds);
    }

    socket.on('location-broadcast', (data) => {
      setMembersLocations(prev => ({
        ...prev,
        [data.userId]: { ...data, timestamp: Date.now() }
      }));
    });

    // Listen for geofence alerts
    socket.on('geofence-alert', (alert) => {
      setNotifications(prev => [{
        id: Date.now(),
        ...alert,
        type: 'geofence'
      }, ...prev].slice(0, 5)); // Keep last 5
    });

    // Listen for new members joining
    socket.on('new-member-alert', (alert) => {
      setNotifications(prev => [{
        id: Date.now(),
        ...alert,
        type: 'join',
        fenceName: 'the group' // Reusing the same UI structure
      }, ...prev].slice(0, 5));
    });

    startTracking();

    // Fetch geofences for all groups
    if (groups && groups.length > 0) {
      groups.forEach(group => {
        dispatch(fetchGeofences(group._id));
      });
    }

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      if (persistenceInterval.current) clearInterval(persistenceInterval.current);
      socket.off('location-broadcast');
      socket.disconnect();
    };
  }, [groups, user, isInvisible]);

  const handleCreateFence = () => {
    if (!myLocation || !newFenceName) return;
    
    if (groups && groups.length > 0) {
      dispatch(createGeofence({
        groupId: groups[0]._id,
        fenceData: {
          name: newFenceName,
          center: { lat: myLocation.lat, lng: myLocation.lng },
          radius: parseInt(newFenceRadius)
        }
      }));
      setIsDrawing(false);
      setNewFenceName('');
    }
  };

  const handleShare = async () => {
    if (!groups || groups.length === 0) return;
    const group = groups[0]; // Share the first group by default
    
    const shareData = {
      title: 'Join my TrackSphere group!',
      text: `Join my group "${group.name}" on TrackSphere using this invite code: ${group.inviteCode}`,
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(group.inviteCode);
        alert(`Invite code ${group.inviteCode} copied to clipboard!`);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] w-full flex flex-col">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapIcon className="text-primary-600" />
            Live Tracking
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {Object.keys(membersLocations).length} member(s) online in your groups
          </p>
        </div>
        
        {isLocating && (
          <div className="flex items-center gap-2 text-primary-600 animate-pulse">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Finding your location...</span>
          </div>
        )}

        {locationError && !isLocating && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle size={18} />
              <span className="text-xs font-medium">{locationError}</span>
            </div>
            <button 
              onClick={startTracking}
              className="px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 relative">
        <MapContainer 
          center={mapCenter} 
          zoom={zoom} 
          style={{ height: '100%', width: '100%', zIndex: 1 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <ChangeView center={mapCenter} zoom={zoom} />

          {/* User's Marker */}
          {myLocation && (
            <>
              <Marker position={[myLocation.lat, myLocation.lng]}>
                <Popup>
                  <div className="text-center">
                    <p className="font-bold">You</p>
                    <p className="text-xs text-gray-500">Currently active</p>
                  </div>
                </Popup>
              </Marker>
              <Circle 
                center={[myLocation.lat, myLocation.lng]} 
                radius={myLocation.accuracy || 20}
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }}
              />
            </>
          )}

          {/* Group Members' Markers */}
          {Object.values(membersLocations).map((member) => (
            <Marker 
              key={member.userId} 
              position={[member.lat, member.lng]}
            >
              <Popup>
                <div className="text-center">
                  <p className="font-bold">{member.userName}</p>
                  <p className="text-xs text-gray-500">Last updated: {new Date(member.timestamp).toLocaleTimeString()}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Geofences */}
          {fences.map((fence) => (
            <Circle
              key={fence._id}
              center={[fence.center.lat, fence.center.lng]}
              radius={fence.radius}
              pathOptions={{ 
                color: '#8b5cf6', 
                fillColor: '#8b5cf6', 
                fillOpacity: 0.2,
                dashArray: '5, 10' 
              }}
            >
              <Popup>
                <div className="text-center p-1">
                  <p className="font-bold text-primary-700">{fence.name}</p>
                  <p className="text-[10px] text-gray-500">Geofence Radius: {fence.radius}m</p>
                </div>
              </Popup>
            </Circle>
          ))}
        </MapContainer>

        {/* Floating Controls */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <button 
            onClick={() => myLocation && setMapCenter([myLocation.lat, myLocation.lng])}
            className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-primary-600 transition"
            title="Recenter on me"
          >
            <Navigation size={20} />
          </button>

          <button 
            onClick={() => setIsDrawing(!isDrawing)}
            className={`p-3 rounded-full shadow-lg transition flex items-center justify-center ${
              isDrawing ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-primary-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            title="Create Geofence"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Geofence Creation Overlay */}
        {isDrawing && (
          <div className="absolute top-20 right-4 z-[1000] w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Radius size={18} className="text-primary-600" />
              New Geofence
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Zone Name</label>
                <input 
                  type="text"
                  value={newFenceName}
                  onChange={(e) => setNewFenceName(e.target.value)}
                  placeholder="e.g. Home, Office"
                  className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:text-gray-200"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Radius: {newFenceRadius}m</label>
                <input 
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={newFenceRadius}
                  onChange={(e) => setNewFenceRadius(e.target.value)}
                  className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600 mt-2"
                />
              </div>
              <p className="text-[10px] text-gray-500 italic">This will create a circle around your current location.</p>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setIsDrawing(false)}
                  className="flex-1 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateFence}
                  disabled={!newFenceName}
                  className="flex-1 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
          {notifications.map(notif => (
            <div 
              key={notif.id}
              className="bg-gray-900/90 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 pointer-events-auto"
            >
              <div className={`p-2 rounded-lg ${notif.type === 'join' ? 'bg-green-500' : 'bg-primary-500'}`}>
                {notif.type === 'join' ? <Users size={18} /> : <BellRing size={18} />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">
                  {notif.userName} <span className="font-normal opacity-80">{notif.type === 'join' ? 'has' : 'entered'}</span> {notif.type === 'join' ? 'joined the group!' : notif.fenceName}
                </p>
                <p className="text-[10px] opacity-60 uppercase font-medium">Just now</p>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                className="opacity-40 hover:opacity-100 p-1"
              >
                <Plus className="rotate-45" size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Sidebar Info (Mobile hidden/Desktop overlay) */}
        <div className="absolute bottom-6 left-6 z-[1000] max-w-xs w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 hidden md:block">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={18} className="text-primary-600" />
              Active Members
            </h3>
            <button 
              onClick={handleShare}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded-md"
              title="Invite Members"
            >
              <Share2 size={12} /> Invite
            </button>
          </div>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {Object.keys(membersLocations).length === 0 ? (
              <p className="text-sm text-gray-500 italic">No other members active right now.</p>
            ) : (
              Object.values(membersLocations).map(member => (
                <div key={member.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium dark:text-gray-200">{member.userName}</span>
                  </div>
                  <button 
                    onClick={() => setMapCenter([member.lat, member.lng])}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Locate
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
