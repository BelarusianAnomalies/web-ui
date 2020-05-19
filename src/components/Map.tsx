import React, {ChangeEvent} from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import './Map.css';
import "./MarkerCluster.css";
import * as L1 from 'leaflet';
import * as L2 from 'leaflet.markercluster';
import "react-datepicker/dist/react-datepicker.css";
import MeteoEyeAPI from "../api/MeteoEyeAPI";
import MeteoEyeResouse from "../api/MeteoEyeResouse";
import i18next from "i18next";
import {Helmet} from 'react-helmet';

import ru from 'date-fns/locale/ru';
import en from 'date-fns/locale/en-US';
import es from 'date-fns/locale/es';
import uk from 'date-fns/locale/uk';
import pl from 'date-fns/locale/pl';
import be from 'date-fns/locale/be';
registerLocale('ru', ru);
registerLocale('en', en);
registerLocale('es', es);
registerLocale('uk', uk);
registerLocale('pl', pl);
registerLocale('be', be);

const L = Object.assign(L1, L2);

const localeStorage = localStorage;
const availableLocales = ['ru', 'uk', 'en', 'es', 'pl', 'be'];

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
            isLoading: false,
            currentLocale: ''
        } as MapState;

        this.updateSinceDate = this.updateSinceDate.bind(this);
        this.updateToDate = this.updateToDate.bind(this);
        this.updateSelectionCount = this.updateSelectionCount.bind(this);
        this.updateMapData = this.updateMapData.bind(this);

        this.languageSelectorChange = this.languageSelectorChange.bind(this);
    }

    componentWillMount() {
        this.setLanguage(this.getCurrentLocale());
    }

    componentDidMount() {
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });

        const ersi = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; <a href="http://www.esri.com/">ESRI</a>',
            maxZoom: 17,
        });

        this.map = L.map('mainMap', {
            zoomControl: false,
            layers: [osm],
            maxZoom: 17,
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

        this.map.attributionControl.addAttribution('&copy; <a href="https://meteoeye.gis.by/">УП &quot;Геоинформационные системы&quot;</a>');
        this.map.attributionControl.addAttribution(`&copy; <a href="https://github.com/pkosilo">${i18next.t('author_copyright')}</a>`);
        this.map.attributionControl.addAttribution('<a href="https://github.com/BelarusianAnomalies/web-ui">GitHub</a>');

        this.markersLayer = L.markerClusterGroup();
        this.markersLayer.addTo(this.map);

        this.loadPoints();

        const updater = setInterval(() => {
            this.loadPoints(this.state, null, true);
        }, 5 * 60 * 1000);
        this.setState({updater: updater})

        const baseMaps = {};

        // @ts-ignore
        baseMaps[i18next.t('layer_satellite')] = ersi
        // @ts-ignore
        baseMaps["OpenStreetMap"] = osm

        const overlays = {}
        // @ts-ignore
        overlays[i18next.t('layer_thermal_anomalies')] = this.markersLayer;

        L.control.zoom({
            position: 'bottomright'
        }).addTo(this.map);
        L.control.layers(baseMaps, overlays, {
            position: 'bottomleft'
        }).addTo(this.map);
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
        <th>${i18next.t('popup_shooting_date')}</th>
        <td>${new Date(Date.parse(item.shootingDateTime.replace(' ', ''))).toLocaleString()}</td>
    </tr>
    <tr>
        <th>${i18next.t('popup_temperature')}</th>
        <td>${item.temperature} К</td>
    </tr>
    <tr>
        <th>${i18next.t('popup_satellite')}</th>
        <td>${item.satellite}</td>
    </tr>
    <tr>
        <th>${i18next.t('popup_coordinates')}</th>
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
                <Helmet>
                    <title>{ i18next.t('title') }</title>
                </Helmet>
                <div id="mainMap" className="leaflet">
                </div>
                <div id="dateSelector">
                    <div className="title">
                        <h3>{i18next.t('title')}</h3>
                    </div>
                    <div className="settings">
                        <div className="settings-row mobile-nonsense">
                            <span>{i18next.t('select_since')}:</span>
                            <div className="input">
                                <DatePicker selectsStart startDate={state.sinceDate} endDate={state.toDate} locale={this.getCurrentLocale()} dateFormat={i18next.t('datetime_format')} showTimeSelect selected={state.sinceDate} onChange={this.updateSinceDate} />
                            </div>
                        </div>
                        <div className="settings-row mobile-nonsense">
                            <span>{i18next.t('select_to')}:</span>
                            <div className="input">
                                <DatePicker selectsEnd startDate={state.sinceDate} endDate={state.toDate} locale={this.getCurrentLocale()} dateFormat={i18next.t('datetime_format')} showTimeSelect selected={state.toDate} minDate={state.sinceDate} onChange={this.updateToDate} />
                            </div>
                        </div>
                        <div className="settings-row">
                            <span>{i18next.t('select_max')}:</span>
                            <div className="input">
                                <input type="number" value={state.count} onChange={this.updateSelectionCount} />
                            </div>
                        </div>
                    </div>
                    <button id="updateMapButton" onClick={this.updateMapData} disabled={state.isLoading}>
                        {
                            state.isLoading ? <div className="loader"/> :
                                <p>
                                    {i18next.t('select_update_button')}
                                </p>
                        }
                    </button>
                    {
                        state.error != null ? <small>{i18next.t('error')}</small> : null
                    }
                    <div className="notes">
                        <small>* {i18next.t('note_updates')}</small>
                        <br />
                        <small>* {i18next.t('note_time')}</small>
                    </div>
                    <div className="lang-selector">
                        <span>{i18next.t('select_language')}:</span>
                        <select onChange={this.languageSelectorChange} value={this.getCurrentLocale()}>
                            <option value="ru">Русский</option>
                            <option value="uk">Українська</option>
                            <option value="be">Беларуская</option>
                            <option value="pl">Polski</option>
                            <option value="en">English</option>
                            <option value="es">Español</option>
                        </select>
                    </div>
                </div>
            </React.Fragment>
        );
    }

    async languageSelectorChange(e: ChangeEvent<HTMLSelectElement>) {
        // @ts-ignore
        window.gtag('event', 'select_language', {
            'event_category' : 'i18n',
            'event_label' : e.target.value
        });

        await this.setLanguage(e.target.value, true);
    }

    async setLanguage(language: string, forced: boolean = false) {
        localeStorage.setItem('lang', language);
        this.setState({currentLocale: language});
        if (forced) {
            // eslint-disable-next-line no-restricted-globals
            location.reload();
        }
        await i18next.init({
            lng: language,
            resources: require(`../../public/locales/${language}.json`)
        });
    }

    getCurrentLocale(): string {
        let lang = localeStorage.getItem('lang');

        if (lang == null || !availableLocales.includes(lang)) {
            lang = 'ru';
        }
        return lang;
    }
}

interface MapState {
    items: MeteoEyeResouse[],
    error: any,
    sinceDate: Date,
    toDate: Date,
    count: number,
    updater: any,
    isLoading: boolean,
    currentLocale: string
}

export default Map;
