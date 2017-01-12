const weather = require('weather-js')
const publicIp = require('public-ip')
const geoip = require('geoip-lite')
const geocoder = require('geocoder')

const icons = {
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

const darkskylink = (ll, forecast) => `https://darksky.net/details/${ll[0]},${ll[1]}/${forecast.date}/us12/en`
const subtitle = (forecast) => `${forecast.skytextday} with a high of ${forecast.high} and a low of ${forecast.low}`
const icon = (input) => {
  const number = parseInt(input, 10)
  return Object.keys(icons).find((key) => {
    return icons[key].includes(number)
  }) || 'fa-question'
}

let inputCache = {}
const getLocation = (query, env) => {
  // From input
  const input = query || env.location || 'lookup'
  if (inputCache[input]) return Promise.resolve(inputCache[input])
  if (input !== 'lookup') {
    return new Promise((resolve, reject) => {
      geocoder.geocode(input, (err, data) => {
        err ? reject(err) : resolve(data)
      })
    }).then((data) => {
      if (data.results.length === 0) {
        throw new Error('Location not found')
      }
      const cord = data.results[0].geometry.location
      inputCache[input] = {
        name: data.results[0].formatted_address,
        ll: [cord.lat, cord.lng],
      }
      return inputCache[input]
    })
  }
  // From ip address
  return publicIp.v4().then((ip) => {
    return geoip.lookup(ip)
  }).then((geo) => {
    inputCache.lookup = {
      name: `${geo.city}, ${geo.region} ${geo.country}`,
      ll: geo.ll,
    }
    return inputCache.lookup
  })
}

module.exports = (pluginContext) => {
  return (query, env = {}) => {
    return getLocation(query, env).then((geo) => {
      const degreeType = (env.degreeType || 'F').toUpperCase()
      return new Promise((resolve, reject) => {
        weather.find({search: geo.name, degreeType}, (err, result) => {
          err ? reject(err) : resolve(result)
        })
      }).then(([response]) => {
        const current = response.current
        const currentLocation = response.location.name
        const today = {
          icon: icon(current.skycode),
          title: `Today (${current.day}) in ${currentLocation}`,
          subtitle: `${current.skytext} with the current temp of ${current.temperature}°${degreeType} and feels like ${current.feelslike}°${degreeType}`,
          value: darkskylink(geo.ll, current),
        }
        let days = []
        const forecasts = response.forecast.slice(2)
        for (let index in forecasts) {
          const forecast = forecasts[index]
          days.push({
            icon: icon(forecast.skycodeday),
            title: `${forecast.day} in ${currentLocation}`,
            subtitle: `${forecast.skytextday} with a high of ${forecast.high}°${degreeType} and a low of ${forecast.low}°${degreeType}`,
            value: darkskylink(geo.ll, forecast),
          })
        }
        return [today, ...days]
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
