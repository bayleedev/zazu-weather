const weather = require('weather-js')
const publicIp = require('public-ip')
const geoip = require('geoip-lite')

var icons = {
  'fa-bolt': [47,37,38,0,1,2,3,4,17,35],
  'fa-snowflake-o': [46,41,5,6,7,8,9,10,13,14,16,42,43,15],
  'fa-umbrella': [45,39,11,12,18,40],
  'fa-cloud': [27,29,33,28,30,34,19,20,21,22,26],
  'fa-flag-o': [23,24],
  'fa-thermometer-empty': [25],
  'fa-moon-o': [31],
  'fa-sun-o': [32],
  'fa-thermometer-full': [36],
}

const subtitle = (forecast) => `${forecast.skytextday} with a high of ${forecast.high} and a low of ${forecast.low}`
const darkskylink = (ll, forecast) => `https://darksky.net/details/${ll[0]},${ll[1]}/${forecast.date}/us12/en`
const icon = (number) => {
  return Object.keys(icons).find((key) => {
    return icons[key].includes(number)
  }) || 'fa-question'
}

module.exports = (pluginContext) => {
  return (query, env = {}) => {
    return new Promise((resolve, reject) => {
      publicIp.v4().then((ip) => {
        const geo = geoip.lookup(ip)
        const ll = geo.ll
        weather.find({search: `${geo.city}, ${geo.region} ${geo.country}`, degreeType: 'F'}, (err, result) => {
          if(err) console.log(err)
          const response = result[0]
          const current = response.current
          const currentLocation = response.location.name
          const today = {
            icon: icon(current.skycodeday),
            title: `Today (${current.day}) in ${currentLocation}`,
            subtitle: subtitle(current),
            value: darkskylink(ll, current),
          }
          let days = []
          const forecasts = response.forecast.slice(2)
          for (let index in forecasts) {
            const forecast = forecasts[index]
            days.push({
              icon: icon(forecast.skycodeday),
              title: `${forecast.day} in ${currentLocation}`,
              subtitle: subtitle(forecast),
              value: darkskylink(ll, forecast),
            })
          }
          resolve([today, ...days])
        })
      })
    })
  }
}

/*
searchers:
> weather
today
  > 
tomorrow
> weather tulsa
today
tomorrow

Configuration:
{
  "name": "blainesch/zazu-weather",
  "variables": {
    "location": "Tulsa, Ok", // default tries to locate you based on ip
    "degree": "c" // default is F
  }
}
*/
