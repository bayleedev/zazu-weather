const weather = require('weather-js')
const publicIp = require('public-ip')
const geoip = require('geoip-lite')
const geocoder = require('geocoder')

const darkskylink = (ll, forecast) => `https://darksky.net/details/${ll[0]},${ll[1]}/${forecast.date}/us12/en`
const icon = (input) => `http://blob.weather.microsoft.com/static/weather4/en-us/law/${input}.gif`

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
      return new Promise((resolve, reject) => {
        weather.find({search: geo.name, degreeType: env.degree || 'F'}, (err, result) => {
          err ? reject(err) : resolve(result)
        })
      }).then(([response]) => {
        const current = response.current
        const currentLocation = response.location.name
        const today = {
          icon: icon(current.skycode),
          title: `Today (${current.day}) in ${currentLocation}`,
          subtitle: `${current.skytext} with the current temp of ${current.temperature} and feels like ${current.feelslike}`,
          value: darkskylink(geo.ll, current),
        }
        let days = []
        const forecasts = response.forecast.slice(2)
        for (let index in forecasts) {
          const forecast = forecasts[index]
          days.push({
            icon: icon(forecast.skycodeday),
            title: `${forecast.day} in ${currentLocation}`,
            subtitle: `${forecast.skytextday} with a high of ${forecast.high} and a low of ${forecast.low}`,
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
