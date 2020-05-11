import MeteoEyePage from "./MeteoEyePage";

const API_URL = 'https://fires.oopscommand.com/api/';

function requestData(count: number, since: Date, to: Date, bounds: any = null): Promise<MeteoEyePage> {
    const today = new Date();
    let d = to.getTime();

    if (today.getTime() < d) {
        d = today.getTime();
    }

    return fetch(`${API_URL}request`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            count: count,
            offset: 0,
            since: since.getTime() / 1000,
            to: d / 1000,
            bounds
        })
    }).then(res => res.json());
}

export default {
    requestData
}
