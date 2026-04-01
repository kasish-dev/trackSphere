import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ShieldAlert, MapPin, Clock } from 'lucide-react';

const PublicSOS = () => {
    const { token } = useParams();
    const [data, setData] = useState(null);

    useEffect(() => {
        try {
            const decoded = atob(token);
            const [lat, lng, userId, timestamp] = decoded.split('|');
            setData({ 
                lat: parseFloat(lat), 
                lng: parseFloat(lng), 
                userId, 
                timestamp: parseInt(timestamp) 
            });
        } catch (e) {
            console.error('Invalid token');
        }
    }, [token]);

    const markerIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
    });

    if (!data) return (
        <div className="h-screen flex items-center justify-center bg-gray-900 text-white flex-col gap-4">
            <ShieldAlert size={64} className="text-red-500 animate-pulse" />
            <h1 className="text-2xl font-bold">Invalid or Expired SOS Link</h1>
        </div>
    );

    return (
        <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-red-600 text-white flex items-center justify-between shadow-lg z-10">
                <div className="flex items-center gap-3">
                    <ShieldAlert size={28} className="animate-bounce" />
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tighter">EMERGENCY SOS</h1>
                        <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest leading-none">Live Path Tracking</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs font-bold flex items-center gap-1 justify-end">
                        <Clock size={12} />
                        {new Date(data.timestamp).toLocaleTimeString()}
                    </div>
                    <p className="text-[10px] opacity-70">Shared via TrackSphere</p>
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                <MapContainer 
                    center={[data.lat, data.lng]} 
                    zoom={18} 
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[data.lat, data.lng]} icon={markerIcon}>
                        <Popup>
                            <div className="text-center font-bold">
                                SOS LOCATION
                            </div>
                        </Popup>
                    </Marker>
                </MapContainer>

                {/* Info Card Overlay */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-[1000]">
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border-4 border-red-600 text-center">
                        <MapPin className="mx-auto mb-2 text-red-600" size={32} />
                        <h2 className="text-2xl font-black text-gray-900 uppercase">IN DANGER</h2>
                        <p className="text-sm text-gray-500 mb-6">User is at this location. Authorities or emergency contacts should be alerted immediately.</p>
                        <a 
                            href={`https://www.google.com/maps?q=${data.lat},${data.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-full bg-primary-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-primary-700 transition text-sm uppercase"
                        >
                            Get Directions
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicSOS;
