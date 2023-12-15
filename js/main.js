'use strict'

async function fetchWeatherData(lat, lon, apiKey) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Weather data fetch failed');
        }
        const data = await response.json();
        displayWeatherData(data);
    } catch (error) {
        console.error('Error: ', error);
    }
}
function displayWeatherData(data) {

    console.log(data);
    document.getElementById('saa').innerText = ` ${data.main.temp} °C`;


}


const lat = '60.1699';
const lon = '24.9384';
const apiKey = 'oma api tähän';

fetchWeatherData(lat, lon, apiKey);



document.addEventListener('DOMContentLoaded', (event) => {
    const updateCameraButton = document.getElementById('kamera');
    if(updateCameraButton) {
        updateCameraButton.addEventListener('click', function() {
            const playerId = window.currentPlayerId;
            updateCamera(playerId);
        });
    }
});


const terrainForm = document.querySelector('#terrain-form');
const terrains = [
 {
   'value': 'metsä',
   'src': 'img/maasto-01.png',
   'alt': 'Kuva metsästä',
 },
 {
   'value': 'vesistö',
   'src': 'img/maasto-02.png',
   'alt': 'Kuva vesistöstä',
 },
 {
   'value': 'pelto',
   'src': 'img/maasto-03.png',
   'alt': 'Kuva pellosta',
 }
]
for (const terrain of terrains) {
 const button = document.createElement('button');
 button.type = 'button';
 button.value = terrain.value;
 button.innerHTML = `<span class="terrain-name">${terrain.value}<br></span>`
 const img = document.createElement('img');
 img.src = terrain.src;
 img.alt = terrain.alt;
 button.appendChild(img);
 terrainForm.appendChild(button);
 button.addEventListener('click', function() {
   birdsighting(button.value);
   document.querySelector('.goal').classList.add('hide');
 })
}


async function birdsighting(terrain) {
 const playerId = window.currentPlayerId;
 try {
      const response = await fetch(`http://127.0.0.1:3000/birdsighting/${playerId}/${terrain}`);
      if (!response.ok) {
        throw new Error('Virhe linnun bongaamisessa');
      }
      const data = await response.json();
      // Päivitetään pelin tilaa tällä.
      const button = document.querySelector('#bird');
      button.innerHTML = '';
      const p = document.createElement('p');
      p.innerHTML = `Lintu jonka bongasit on: ${data.bird.name}!<br>Lintukuvan arvo on ${data.bird.worth}€`;
      const img = document.createElement('img');
      img.src = `img/lintukuvat/${data.bird.name}.png`;
      img.alt = `${data.bird.name}`;
      button.appendChild(p);
      button.appendChild(img);
      document.querySelector('.bird').classList.remove('hide');
      document.querySelector('#budget').innerText = data.player.budget;
      // Popup menee piiloon kun sitä klikkaa
      button.addEventListener('click', function() {
        document.querySelector('.bird').classList.add('hide');
      })
      console.log(data);
 } catch (error) {
      console.error('Virhe: ', error);
 }
}


// Tämä funktio laittaa maasto-formin näkyviin ja sen jälkeen pelaaja voi valita maaston
function showTerrain() {
 document.querySelector('.goal').classList.remove('hide');
}




function resetGame() {
    // Alustetaan pelin tila
  document.querySelector('#player-name').innerText = '';
  document.querySelector('#budget').innerText = '';
  document.querySelector('#consumed').innerText = '';

  map.eachLayer(function(layer) {
    if (!!layer.toGeoJSON) {
      map.removeLayer(layer);
    }});

    document.querySelector('#player-modal').classList.remove('hide');
  }

//Funktio pelin lopettamiseksi
  function checkGameOver() {
    const budget = parseInt(document.querySelector('#budget').innerText);
    if (budget <= 0) {
      alert("Rahat loppuivat! Peli päättyi!");
      resetGame();
    } else if (budget >= 5000) {
      alert("Onneksi olkoon! Voitit pelin!");
      resetGame();
    }
  }

// Kartan luonti
  const map = L.map('map', {tap: false});
  L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
  }).addTo(map);
  map.setView([60, 24], 7);

//Pelaaja-form

  document.querySelector('#player-form').
      addEventListener('submit', function(evt) {
        evt.preventDefault();
        const playerName = document.querySelector('#player-input').value;
        document.querySelector('#player-modal').classList.add('hide');
        startGame(`http://127.0.0.1:3000/newgame/${playerName}`);
      });

//Funktio pelin pyörittämiseksi
  async function startGame(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Virhe');
      }
      const data = await response.json();
      console.log(data);
      document.querySelector('#player-name').innerText = data.player.name;
      document.querySelector('#budget').innerText = data.budget;
      document.querySelector('#consumed').innerText = data.camera.name;

      window.currentPlayerId = data.player.id;

      // Pelin alussa, ladataan matkustusvaihtoehdot
      const playerId = data.player.id;
      const currentIdent = "EFHK";
      loadTravelOptions(playerId, currentIdent);

    } catch (error) {
      console.error('Virhe: ', error);
    }
  }

// Kohteiden haku
  async function loadTravelOptions(playerId, currentIdent) {
    try {
      const response = await fetch(
          `http://127.0.0.1:3000/traveloptions/${currentIdent}`);
      if (!response.ok) {
        throw new Error('Failed to fetch travel options');
      }
      const travelOptions = await response.json();

      const playerBudget = parseInt(
          document.querySelector('#budget').innerText);

      travelOptions.forEach(option => {
        if (option.geography) {
          const distance = option.geography.distance;
          const cost = distance * 2;
          // Kommentoituna kohta jolla rajataan kohteet pelaajan budjetin mukaan
          //   if (cost <= playerBudget) {
          const lat = option.geography.latitude;
          const lng = option.geography.longitude;
          const name = option.location.name;
          const ident = option.location.id;

          const popupMessage = `<div>${name}<br>Kustannus: ${cost} €<br>
                <button onclick='travelTo("${ident}", ${cost})'>Matkusta tänne</button></div>`;

          L.marker([lat, lng]).addTo(map).bindPopup(popupMessage);
        }
        // }
      });
    } catch (error) {
      console.error('Error: ', error);
    }
  }

// Matkustustoiminnon toteutus
  async function travelToLocation(playerId, destinationIdent, cost) {
    if (confirm(
        `Haluatko matkustaa kohteeseen ${destinationIdent}? Tämä maksaa ${cost} €`)) {
      try {
        const url = `http://127.0.0.1:3000/goto/${playerId}/${destinationIdent}/${cost}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Matkustaminen epäonnistui');
        }
        const updatedData = await response.json();

        // Päivitä pelin tila (budjetti ja sijainti)
        document.querySelector('#budget').innerText = updatedData.budget;
        window.currentLocation = updatedData.location.id;
        console.log(updatedData.location.id);
        console.log(updatedData);
        // Päivitä matkustusvaihtoehdot uuden sijainnin perusteella
        loadTravelOptions(playerId, updatedData.location.id);
        document.querySelector('#sijainti').innerText = updatedData.location.name;
        //fetchWeatherData(updatedData.location.geography.latitude, updatedData.location.geography.longitude, apiKey)

        // Näytä maastoformi
        showTerrain();

        checkGameOver();
      } catch (error) {
        console.error('Virhe: ', error);
      }
    }
  }

// Matkustustoiminnon toteutus
  function travelTo(ident, cost) {

    const playerId = window.currentPlayerId;

    // const destinationIdent = locationName;

    travelToLocation(playerId, ident, cost);
    console.log(
        "Matkustetaan kohteeseen: " + ident + " kustannuksella: " + cost +
        " €");

  }



//Kameran päivitys

  async function updateCamera(playerId) {

    try {
      // Hae kameran päivitystiedot
      const response = await fetch(
          `http://127.0.0.1:3000/updatecamera/${playerId}`);
      if (!response.ok) {
        throw new Error('Ei löydy kameroita');
      }
      const cameraOptions = await response.json();

      // Tarkista haluaako pelaaja päivittää ja onko varaa
      const wantsToUpgrade = confirm(
          `Haluatko päivittää kameran? Uusi kamera: ${cameraOptions.model}, Hinta: ${cameraOptions.price} €`);
      if (!wantsToUpgrade) {
        console.log('Pelaaja ei päivittänyt kameraa.');
        return;
      }

      const currentBudget = parseInt(
          document.getElementById('budget').innerText);
      if (currentBudget < cameraOptions.price) {
        alert('Ei tarpeeksi rahaa kameran päivittämiseen.');
        return;
      }

      // Päivitä kamera ja budjetti
      const upgradeResponse = await fetch(
          `http://127.0.0.1:3000/upgradecamera/${playerId}/${cameraOptions.id}/${cameraOptions.price}`);
      if (!upgradeResponse.ok) {
        throw new Error('Kameran päivitys epäonnistui');
      }

      const updatedData = await upgradeResponse.json();
      document.getElementById('budget').innerText = updatedData.budget;
      document.getElementById('consumed').textContent = updatedData.camera.name;

      console.log('Kamera päivitetty: ' + updatedData.camera.name);
    } catch (error) {
      console.error('Error: ', error);
    }
}