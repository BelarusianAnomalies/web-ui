import React, {ChangeEvent} from 'react';
import DatePicker, { registerLocale, setDefaultLocale } from 'react-datepicker';
import './Map.css';
import * as L from 'leaflet';
import "react-datepicker/dist/react-datepicker.css";
import MeteoEyeAPI from "../api/MeteoEyeAPI";
import MeteoEyeResouse from "../api/MeteoEyeResouse";

import ru from 'date-fns/locale/ru';
registerLocale('ru', ru)

class Map extends React.Component {
    private fireIcon = L.icon({
        iconUrl: 'fireicon.png',

        iconSize:     [32, 32], // size of the icon
        shadowSize:   [0, 0], // size of the shadow
        iconAnchor:   [16, 16], // point of the icon which will correspond to marker's location
        shadowAnchor: [0, 0],  // the same for the shadow
        popupAnchor:  [0,-16] // point from which the popup should open relative to the iconAnchor
    });

    private map: any;
    private markersLayer: any;

    private updater: any;

    constructor(props: any) {
        super(props);
        this.state = {
            error: null,
            items: [],
            sinceDate: new Date(new Date().setDate(new Date().getDate()-1)),
            toDate: new Date(new Date().setDate(new Date().getDate()+1)),
            count: 10000,
            updater: null,
            isLoading: false
        } as MapState;

        this.updateSinceDate = this.updateSinceDate.bind(this);
        this.updateToDate = this.updateToDate.bind(this);
        this.updateSelectionCount = this.updateSelectionCount.bind(this);
        this.updateMapData = this.updateMapData.bind(this);
    }

    componentDidMount() {
        this.map = L.map('mainMap', {
            zoomControl: false
        }).setView([53.899602, 27.559529], 7);

        this.map.on('moveend', (event: any) => {
            const bounds = event.target.getBounds();

            const bounds2 = [
                [bounds._northEast.lng, bounds._northEast.lat],
                [bounds._northEast.lng, bounds._southWest.lat],
                [bounds._southWest.lng, bounds._southWest.lat],
                [bounds._southWest.lng, bounds._northEast.lat],
            ];
            // @ts-ignore
            window.gtag('event', 'moved', {
                'event_category' : 'map',
                'event_label' : `northEast: ${bounds._northEast.lng}, ${bounds._northEast.lat}, southWest: ${bounds._southWest.lng}, ${bounds._southWest.lat}, `
            });
        });

        this.map.on('popupopen', (event: L.PopupEvent) => {
            // @ts-ignore
            const object = JSON.parse((event.popup._container as HTMLElement).getElementsByClassName('map-marker-popup-fire')[0].innerHTML) as MeteoEyeResouse;

            // @ts-ignore
            window.gtag('event', 'open_popup', {
                'event_category' : 'map',
                'event_label' : `${object.id}: ${object.shootingDateTime}, ${object.coordinatesWKT}`
            });
        });

        this.map.on('popupclose', (event: L.PopupEvent) => {
            // @ts-ignore
            const object = JSON.parse((event.popup._container as HTMLElement).getElementsByClassName('map-marker-popup-fire')[0].innerHTML) as MeteoEyeResouse;

            // @ts-ignore
            window.gtag('event', 'close_popup', {
                'event_category' : 'map',
                'event_label' : `${object.id}: ${object.shootingDateTime}, ${object.coordinatesWKT}`
            });
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        L.control.zoom({
            position: 'bottomright'
        }).addTo(this.map);

        this.map.attributionControl.addAttribution('&copy; <a href="https://meteoeye.gis.by/">УП &quot;Геоинформационные системы&quot;</a>');
        this.map.attributionControl.addAttribution('&copy; <a href="https://github.com/pkosilo">Косило Павел</a>');
        this.map.attributionControl.addAttribution('<a href="https://github.com/BelarusianAnomalies/web-ui">GitHub</a>');

        this.markersLayer = L.layerGroup().addTo(this.map);

        this.loadPoints();

        const updater = setInterval(() => {
            this.loadPoints(this.state, null, true);
        }, 5 * 60 * 1000);
        this.setState({updater: updater})
    }

    componentWillUnmount() {
        clearInterval((this.state as MapState).updater);
    }

    private loadPoints(s: any = this.state, bounds: any = null, update: boolean = false) {
        this.setState({isLoading: true});
        const state = s as MapState;

        if (!update) {
            // @ts-ignore
            window.gtag('event', 'search', { searchterm : `${state.sinceDate.toISOString()}->${state.toDate.toISOString()}, count: ${state.count}` });
        }

        MeteoEyeAPI.requestData(state.count, state.sinceDate, state.toDate, bounds).then(page => {
            this.setState({items: page.items});
            this.addPoints(update);
            this.setState({isLoading: false, error: null});
        }).catch(error => {
            this.setState({isLoading: false, error});
        });
    }

    private addPoints(update: boolean = false) {
        this.markersLayer.clearLayers();

        const state = (this.state as MapState)

        state.items.forEach((item: MeteoEyeResouse) => {
            const coordinates = item.coordinatesWKT.match(/\(([^)]+)\)/)![0].split(' ').map(value => {
                return parseFloat(value.replace('(', '').replace(')', ''))
            });

            L.marker({lat: coordinates[1], lng: coordinates[0]}, {icon: this.fireIcon}).addTo(this.markersLayer)
                .bindPopup(`
<div style="display: none;" class="map-marker-popup-fire">
${JSON.stringify(item)}
</div>
<table>
    <tr>
        <th>Дата съёмки</th>
        <td>${new Date(Date.parse(item.shootingDateTime.replace(' ', ''))).toLocaleString()}</td>
    </tr>
    <tr>
        <th>Температура</th>
        <td>${item.temperature} К</td>
    </tr>
    <tr>
        <th>Спутник</th>
        <td>${item.satellite}</td>
    </tr>
    <tr>
        <th>Координаты</th>
        <td>
            ${coordinates[1]}, ${coordinates[0]}
        </td>
    </tr>
</table>
                `);
        });

        if (!update) {
            // @ts-ignore
            window.gtag('event', 'view_search_results', { searchterm : `${state.sinceDate.toISOString()}->${state.toDate.toISOString()}, count: ${state.count}` });
        }
    }

    updateSinceDate(d: Date) {
        this.setState({sinceDate: d});
    }

    updateToDate(d: Date) {
        this.setState({toDate: d});
    }

    updateSelectionCount(event: ChangeEvent<HTMLInputElement>) {
        this.setState({count: parseInt(event.target.value, 10)});
    }

    updateMapData() {
        if ((this.state as MapState).isLoading) {
            return;
        }

        this.loadPoints();
    }

    render() {
        const state = (this.state as MapState);
        return (
            <React.Fragment>
                <div id="mainMap" className="leaflet">
                </div>
                <div id="dateSelector">
                    <div className="title">
                        <h3>Тепловые аномалии</h3>
                        <p>
                            <small>Тепловые аномалии - не пожары</small>
                        </p>
                    </div>
                    <table>
                        <tbody>
                            <tr>
                                <th>С:</th>
                                <td>
                                    <DatePicker selectsStart startDate={state.sinceDate} endDate={state.toDate} locale="ru" dateFormat="MMMM d, yyyy HH:mm" showTimeSelect selected={state.sinceDate} onChange={this.updateSinceDate} />
                                </td>
                            </tr>
                            <tr>
                                <th>По:</th>
                                <td>
                                    <DatePicker selectsEnd startDate={state.sinceDate} endDate={state.toDate} locale="ru" dateFormat="MMMM d, yyyy HH:mm" showTimeSelect selected={state.toDate} minDate={state.sinceDate} onChange={this.updateToDate} />
                                </td>
                            </tr>
                            <tr>
                                <th>Кол-во (max):</th>
                                <td>
                                    <input type="number" value={state.count} onChange={this.updateSelectionCount} />
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={2}>
                                    <button id="updateMapButton" onClick={this.updateMapData} disabled={state.isLoading}>
                                        {
                                            state.isLoading ? <div className="loader"/> :
                                            <p>
                                                Обновить
                                            </p>
                                        }
                                    </button>
                                    {
                                        state.error != null ? <small>Произошла ошибка</small> : null
                                    }
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <small>* Данные обновляются каждые 5 минут</small>
                    <br />
                    <small>* Время - местное</small>
                </div>
            </React.Fragment>
        );
    }
}

interface MapState {
    items: MeteoEyeResouse[],
    error: any,
    sinceDate: Date,
    toDate: Date,
    count: number,
    updater: any,
    isLoading: boolean
}

export default Map;
