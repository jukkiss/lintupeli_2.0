class Location:
   def __init__(self, ident, loc_name, latitude, longitude, distance, active_loc = False):


       self.status = {
           'location' : {
               'id' : ident,
               'name' : loc_name,
               'active' : active_loc
           },
           'geography' : {
               'latitude' : latitude,
               'longitude' : longitude,
               'distance' : distance
           },
           'cost' : distance * 2
       }


       self.latitude = latitude
       self.longitude = longitude

