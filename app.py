import json
import os
import random


import geopy.distance


import mysql.connector
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS


from player import Player
from location import Location


load_dotenv()


app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'


# database connection
connection = mysql.connector.connect(
            host=os.environ.get('HOST'),
            port= 3306,
            database=os.environ.get('DB_NAME'),
            user=os.environ.get('DB_USER'),
            password=os.environ.get('DB_PASS'),
            autocommit=True
            )


def get_player_id():
   sql = "SELECT MAX(pelaaja_id) as pelaaja_id FROM pelaaja;"
   cursor = connection.cursor(dictionary=True)
   cursor.execute(sql)
   result = cursor.fetchone()
   return result['pelaaja_id']


def get_player_budget(player_id):
   tuple = (player_id,)
   sql = "SELECT budjetti FROM pelaaja WHERE pelaaja_id = %s;"
   cursor = connection.cursor(dictionary=True)
   cursor.execute(sql, tuple)
   result = cursor.fetchone()
   return result['budjetti']


def get_player_camera(player_id):
   tuple = (player_id,)
   sql = "SELECT kamera FROM pelaaja WHERE pelaaja_id = %s;"
   cursor = connection.cursor(dictionary=True)
   cursor.execute(sql, tuple)
   result = cursor.fetchone()
   return result['kamera']


def get_current_location(ident):
   tuple = (ident,)
   sql = "SELECT latitude_deg, longitude_deg, municipality, ident FROM airport WHERE ident = %s;"
   cursor = connection.cursor(dictionary=True)
   cursor.execute(sql, tuple)
   result = cursor.fetchone()
   current_loc = Location(result['ident'], result['municipality'], result['latitude_deg'], result['longitude_deg'], 0, True)
   return current_loc


def get_locations(ident, result):
   locations = []
   current_loc = get_current_location(ident)
   for location in result:
       if location['ident'] != ident:
           coordinates1 = [current_loc.latitude, current_loc.longitude]
           coordinates2 = [location['latitude_deg'], location['longitude_deg']]
           distance = geopy.distance.distance(coordinates1, coordinates2).km
           loc = Location(location['ident'], location['municipality'], location['latitude_deg'],
                          location['longitude_deg'], round(distance))
           locations.append(loc.status)
       else:
           locations.append(current_loc.status)


   return locations


def get_bird(result1, result2):
   # function to randomize a bird for birdsighting
   birds_in_terrain = []
   for bird in result2:
       birds_in_terrain.append(bird['lintu_id'])


   total_probability = 0
   for bird in result1:
       if bird['lintu_id'] in birds_in_terrain:
           bird['todennäköiysyys'] = bird['todennäköiysyys'] * 10
       total_probability += bird['todennäköiysyys']


   randomized_bird = random.randint(1, total_probability)
   n = 0
   bird_sighted = {}
   for bird in result1:
       n += bird['todennäköiysyys']
       if n >= randomized_bird and bird_sighted == {}:
           bird_sighted = bird
   return bird_sighted


def find_birds(terrain, player_id):
   # function for birdsighting
   sql1 = "SELECT lintu_id, linnun_nimi, arvo, todennäköiysyys FROM linnut;"
   cursor = connection.cursor(dictionary=True)
   cursor.execute(sql1)
   result1 = cursor.fetchall()


   tuple2 = (terrain,)
   sql2 = """SELECT linnut.lintu_id FROM linnut, maastoliitos, maasto
           WHERE linnut.lintu_id = maastoliitos.lintu_id AND maasto.maasto_id = maastoliitos.maasto_id
           AND maasto_tyyppi = %s;"""
   cursor = connection.cursor(dictionary=True)
   cursor.execute(sql2, tuple2)
   result2 = cursor.fetchall()


   bird_found = get_bird(result1, result2)
   tuple3 = (player_id,)
   sql3 = """SELECT kerroin FROM kamera, pelaaja
               WHERE kamera.kamera_id = pelaaja.kamera AND pelaaja_id = %s;"""
   cursor = connection.cursor(dictionary=True)
   cursor.execute(sql3, tuple3)
   result3 = cursor.fetchone()
   bird_found['arvo'] = bird_found['arvo'] * result3['kerroin']
   return bird_found


def player_status(player_id):
   # function to get status of player
   tuple = (player_id,)
   sql = """SELECT pelaajan_nimi, pelaajan_sijainti, municipality, kamera, malli, budjetti
           FROM pelaaja, airport, kamera WHERE pelaaja_id = %s AND pelaaja.pelaajan_sijainti = airport.ident
           AND pelaaja.kamera = kamera.kamera_id;"""
   cursor = connection.cursor(dictionary=True)
   cursor.execute(sql, tuple)
   result = cursor.fetchone()


   player_info = Player(player_id, result['pelaajan_nimi'], result['pelaajan_sijainti'], result['municipality'],
                        result['kamera'], result['malli'], result['budjetti'])
   return player_info



#Sophian
@app.route('/newgame/<player>')
def newgame(player):
   # function to set up new game
   tuple = (player,)
   sql = """INSERT INTO pelaaja (pelaajan_nimi, budjetti, kamera, pelaajan_sijainti)
           VALUES (%s, 1000, 1, "EFHK");"""
   cursor = connection.cursor(dictionary=True)
   cursor.execute(sql, tuple)


   game = get_player_id()
   player_info = player_status(game)
   json_data = json.dumps(player_info.player_status, indent=4)
   return json_data


@app.route('/traveloptions/<ident>')
def traveloptions(ident):
   # function to get all locations
   sql = """SELECT latitude_deg, longitude_deg, municipality, ident FROM airport
       WHERE iso_country = "FI" AND (TYPE = "large_airport" OR TYPE = "medium_airport")
       AND municipality <> '';"""
   cursor = connection.cursor(dictionary=True)
   cursor.execute(sql)
   result = cursor.fetchall()


   locations = get_locations(ident, result)
   json_data = json.dumps(locations, indent=4)
   return json_data


@app.route('/goto/<game>/<ident>/<cost>')
def goto(game, ident, cost):
   # function to go to another location
   budget = get_player_budget(game) - int(cost)
   tuple = (ident, budget, game)
   sql = """UPDATE pelaaja SET pelaajan_sijainti = %s, budjetti = %s
           WHERE pelaaja_id = %s;"""
   cursor = connection.cursor(dictionary=True)
   cursor.execute(sql, tuple)


   player_info = player_status(game)
   json_data = json.dumps(player_info.player_status, indent=4)
   return json_data


@app.route('/updatecamera/<game>')
def updatecamera(game):
   # function to get info on camera upgrade
   new_camera = get_player_camera(game) + 1
   tuple = (new_camera,)
   sql = "SELECT kamera_id, hinta, malli FROM kamera WHERE kamera_id = %s;"
   cursor = connection.cursor(dictionary=True)
   cursor.execute(sql, tuple)
   result = cursor.fetchone()


   camera_info = {
       'id' : result['kamera_id'],
       'model' : result['malli'],
       'price' : result['hinta']
   }
   json_data = json.dumps(camera_info, indent=4)
   return json_data


@app.route('/upgradecamera/<game>/<newcamera>/<cost>')
def upgradecamera(game, newcamera, cost):
   # function to upgrade the players camera
   budget = get_player_budget(game) - int(cost)
   tuple = (newcamera, budget, game)
   sql = "UPDATE pelaaja SET kamera = %s, budjetti = %s WHERE pelaaja_id = %s;"
   cursor = connection.cursor(dictionary=True)
   cursor.execute(sql, tuple)


   player_info = player_status(game)
   json_data = json.dumps(player_info.player_status, indent=4)
   return json_data


@app.route('/birdsighting/<game>/<terrain>')
def birdsighting(game, terrain):
   # function for birdsighting
   bird_found = find_birds(terrain, game)
   bird_info = {
       'name' : bird_found['linnun_nimi'],
       'worth' : bird_found['arvo']
   }


   budget = get_player_budget(game) + bird_info['worth']
   tuple = (budget, game)
   sql = "UPDATE pelaaja SET budjetti = %s WHERE pelaaja_id = %s;"
   cursor = connection.cursor(dictionary=True)
   cursor.execute(sql, tuple)


   player_info = player_status(game)
   info = {
       'bird' : bird_info,
       'player' : player_info.player_status
   }
   json_data = json.dumps(info, indent=4)
   return json_data

#Merkkaa dokumentteihin jos toimii
@app.route('/getplayerbudget/<int:player_id>')
def get_player_budget_route(player_id):
    budget = get_player_budget(player_id)
    json_data = json.dumps(budget, indent=4)
    return json_data


if __name__ == '__main__':
   app.run(use_reloader=True, host='127.0.0.1', port=3000)

