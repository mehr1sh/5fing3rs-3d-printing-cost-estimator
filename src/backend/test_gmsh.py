import gmsh

gmsh.initialize()
gmsh.merge("test.step")
gmsh.model.geo.synchronize()
gmsh.write("test.stl")
gmsh.finalize()
