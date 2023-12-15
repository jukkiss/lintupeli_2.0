class Player:
   def __init__(self, player_id, player_name, loc_id, location, camera_id, camera, budget):


       self.player_status = {
           'player' : {
               'id' : player_id,
               'name' : player_name
           },
           'location' : {
               'id': loc_id,
               'name' : location
           },
           'camera' : {
               'id' : camera_id,
               'name' : camera
           },
           'budget': budget,
       }

