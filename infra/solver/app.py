from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Optional

from ortools.constraint_solver import pywrapcp, routing_enums_pb2


app = FastAPI(title="personel-solver", version="0.1.0")


class SolveTspIn(BaseModel):
    durationsSec: List[List[Optional[float]]] = Field(..., min_length=2)
    depotIndex: int = 0
    returnToDepot: bool = False
    timeLimitSec: int = 2


def _solve_tsp_ortools(durations, depot=0, return_to_depot=False, time_limit_sec=2):
    n = len(durations)
    depot = max(0, min(int(depot), n - 1))

    manager = pywrapcp.RoutingIndexManager(n, 1, depot)
    routing = pywrapcp.RoutingModel(manager)

    def cost_callback(from_index, to_index):
        i = manager.IndexToNode(from_index)
        j = manager.IndexToNode(to_index)
        v = durations[i][j]
        if v is None:
            return 10 ** 9
        try:
            x = float(v)
            if x < 0:
                return 10 ** 9
            return int(round(x))
        except Exception:
            return 10 ** 9

    cb = routing.RegisterTransitCallback(cost_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(cb)

    params = pywrapcp.DefaultRoutingSearchParameters()
    params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    params.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    params.time_limit.seconds = max(1, min(int(time_limit_sec), 10))

    assignment = routing.SolveWithParameters(params)
    if assignment is None:
        return None

    # Extract route
    index = routing.Start(0)
    order = [manager.IndexToNode(index)]
    while not routing.IsEnd(index):
        index = assignment.Value(routing.NextVar(index))
        if routing.IsEnd(index):
            break
        order.append(manager.IndexToNode(index))

    if return_to_depot:
        order.append(depot)
    return order


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/solve-tsp")
def solve_tsp(body: SolveTspIn):
    d = body.durationsSec
    n = len(d)
    if n < 2 or n > 80:
        return {"ok": False, "error": "nOutOfRange"}
    # square check
    for row in d:
        if len(row) != n:
            return {"ok": False, "error": "matrixNotSquare"}

    order = _solve_tsp_ortools(d, depot=body.depotIndex, return_to_depot=body.returnToDepot, time_limit_sec=body.timeLimitSec)
    if order is None:
        return {"ok": False, "error": "noSolution"}
    return {"ok": True, "order": order}
