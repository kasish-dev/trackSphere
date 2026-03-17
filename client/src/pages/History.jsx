import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { fetchHistory } from '../redux/locationSlice';
import { Loader2, History as HistoryIcon, Clock, Calendar, ChevronRight } from 'lucide-react';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const History = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { history, isLoading } = useSelector((state) => state.location);
  
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [zoom, setZoom] = useState(5);
  const [selectedPoint, setSelectedPoint] = useState(null);

  useEffect(() => {
    if (user?.user?.id) {
      dispatch(fetchHistory(user.user.id));
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (history && history.length > 0) {
      setMapCenter([history[0].lat, history[0].lng]);
      setZoom(14);
    }
  }, [history]);

  const polylinePositions = history.map(point => [point.lat, point.lng]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="h-[calc(100vh-64px)] w-full flex flex-col md:flex-row">
      {/* Sidebar - History List */}
      <div className="w-full md:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HistoryIcon className="text-primary-600" />
            Location History
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Recent activity for {user?.user?.name}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-primary-600" size={32} />
              <p className="text-sm text-gray-500">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="mx-auto text-gray-300 mb-2" size={40} />
              <p className="text-sm text-gray-500 italic">No history points found yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {history.map((point, index) => (
                <button
                  key={point._id}
                  onClick={() => {
                    setMapCenter([point.lat, point.lng]);
                    setZoom(17);
                    setSelectedPoint(point);
                  }}
                  className={`w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition text-left ${
                    selectedPoint?._id === point._id ? 'bg-primary-50 dark:bg-primary-900/10 border-l-4 border-primary-600' : ''
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatDate(point.timestamp)}
                    </span>
                    <span className="text-[10px] text-gray-500 flex items-center gap-1 uppercase font-semibold">
                      <Calendar size={10} /> {new Date(point.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map Content */}
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

          {/* Path Line */}
          {polylinePositions.length > 1 && (
            <Polyline 
              positions={polylinePositions} 
              pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.6, dashArray: '10, 10' }} 
            />
          )}

          {/* Current and Past Markers */}
          {history.map((point, index) => (
            <Marker 
              key={point._id} 
              position={[point.lat, point.lng]}
              opacity={index === 0 ? 1 : 0.4} // Most recent point is solid
            >
              <Popup>
                <div className="text-center">
                  <p className="font-bold">{formatDate(point.timestamp)}</p>
                  <p className="text-xs text-gray-500">
                    Accuracy: {Math.round(point.accuracy)}m
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Floating Info Overlay */}
        {selectedPoint && (
          <div className="absolute top-4 left-4 z-[1000] bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700">
            <p className="text-xs font-bold text-gray-400 uppercase">Selected Point</p>
            <p className="font-bold text-primary-600">{formatDate(selectedPoint.timestamp)}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
