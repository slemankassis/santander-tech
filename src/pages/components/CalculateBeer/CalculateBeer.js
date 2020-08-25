import React from 'react';
import moment from 'moment';
import DatetimePicker from 'react-datetime-picker';
import { useFetch } from './../../hooks';
import { COORDINATES } from './../../Constants';
import MockAdapter from "axios-mock-adapter";

const mock = new MockAdapter(axios);

mock.onGet(new RegExp("https://weatherbit-v1-mashape.p.rapidapi.com/current/*")).reply(200, {
  count: 1,
  data: [{
    app_temp: 16,
    aqi: 35,
    city_name: "Buenos Aires",
    clouds: 0,
    country_code: "AR",
    datetime: "2020-08-22:19",
    dewpt: 5,
    dhi: 87.11,
    dni: 733.66,
    elev_angle: 26.68,
    ghi: 410.22,
    h_angle: 45,
    lat: - 34.64,
    lon: -58.4,
    ob_time: "2020-08-22 19:00",
    pod: "d",
    precip: 0,
    pres: 1023.3,
    rh: 48,
    slp: 1024,
    snow: 0,
    solar_rad: 410.2,
    state_code: "07",
    station: "SABE",
    sunrise: "10:23",
    sunset: "21:28",
    temp: 16,
    timezone: "America/Argentina/Buenos_Aires",
    ts: 1598122800,
    uv: 4.57939,
    vis: 5,
    weather: { icon: "c01d", code: "800", description: "Clear sky" },
    wind_cdir: "NNE",
    wind_cdir_full: "north-northeast",
    wind_dir: 20,
    wind_spd: 3.6,
  }],
});

const CalculateBeer = () => {
  const [qtyAttendees, setQtyAttendees] = React.useState();
  const [formattedDatetime, setFormattedDatetime] = React.useState();
  const [boxes, setBoxes] = React.useState();

  const formatDateTimeToString = (date, format) => moment(date).format(format);

  const formatDatetimeToUtc = datetime => formatDateTimeToString(datetime, 'YYYY-MM-DDTHH:mm:ss[Z]');

  const handleChangeDatetime = (datetime) => setFormattedDatetime(formatDatetimeToUtc(datetime));

  const handleChange = (event) => {
    setQtyAttendees(event.target.value);
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    const [data] = useFetch(
      `https://weatherbit-v1-mashape.p.rapidapi.com/current?lang=en&lon=${COORDINATES.LON}&lat=${COORDINATES.LAT}&datetime=${formattedDatetime}`, {
      "headers": {
        "x-rapidapi-host": "weatherbit-v1-mashape.p.rapidapi.com",
        "x-rapidapi-key": "1456dc017emsha9abe912476d07ep1a9e30jsn21a496626616",
      }
    });
    const temperature = data.data.temp;
    let qtyBeers;
    if (temperature < 20) {
      qtyBeers = qtyAttendees * 0.75;
    } else if (20 <= temperature < 24) {
      qtyBeers = qtyAttendees * 1;
    } else if (temperature >= 24) {
      qtyBeers = qtyAttendees * 2;
    }
    const boxes = Math.ceil(qtyBeers / 6);
    setBoxes(boxes);
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <label>
          Quantity of attendees:
        <input
            value={qtyAttendees}
            type="number"
            onChange={handleChange}
          />
        </label>
        <input type="submit" value="Submit" />
        <DatetimePicker
          onChange={handleChangeDatetime}
          value={new Date()}
        />
      </form>
      <p>Quantity of beer boxes: {boxes}</p>
    </>
  );
}

export default CalculateBeer;
