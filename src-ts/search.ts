'use strict';

type Id = number;
type Score = number;
type Distance = number;

interface GraphNode {
    readonly lat: number;
    readonly lng: number;
    readonly id: Id;
    readonly connections: Connection[];
}

interface Connection { // "Adjacency" is too hard to spell
    readonly distance: Distance;
    readonly child: GraphNode;
}

type ScoringFunction = (info: {
    node: GraphNode
    pathDistance: Distance;
}) => Score;

interface OverpassJSON {
    elements: {
        nodes: number[];
        geometry: {
            lat: number;
            lon: number;
        }[];
        tags: {
            junction: string
        };
    }[];
}

type SearchFunction = (start: GraphNode, goal: GraphNode) => SearchResult;

type SearchResult = {
    expanded: GraphNode[],
    path?: GraphNode[],
    fringe?: PriorityQueue<GraphNode>
};

const uniformCostSearch: SearchFunction = (start, goal) =>
    bestFirstSearch(start, goal, ({ pathDistance }) => pathDistance);

const greedySearch: SearchFunction = (start, goal) =>
    bestFirstSearch(start, goal, ({ node }) => distanceBetween(node, goal));

const aStarSearch: SearchFunction = (start, goal) =>
    bestFirstSearch(start, goal, ({ node, pathDistance }) =>
        pathDistance + distanceBetween(node, goal));

function bestFirstSearch(start: GraphNode, goal: GraphNode,
scoreFunc: ScoringFunction): SearchResult {
    const expanded: GraphNode[] = [];
    const pathDistances = new Map<Id, Distance>([[start.id, 0]]);
    const scores = new Map<Id, Score>([[start.id, scoreFunc({
        node: start,
        pathDistance: 0
    })]]);
    const parents = new Map<Id, GraphNode>();
    const fringe = new PriorityQueue<GraphNode>({
        comparator: (a: GraphNode, b: GraphNode) =>
            (scores.get(a.id) as Score) - (scores.get(b.id) as Score),
        initialValues: [start]
    });
    while (fringe.length > 0) {
        const current = fringe.dequeue();
        if (expanded.includes(current)) {
            continue;
        }
        expanded.push(current);
        const currentPathDistance = pathDistances.get(current.id) as Distance;
        if (current === goal) {
            const path = [goal];
            let parent = goal;
            while (parent !== start) {
                parent = parents.get(parent.id) as GraphNode;
                path.unshift(parent);
            }
            return { expanded, path, fringe };
        }
        for (const { distance, child } of current.connections) {
            if (expanded.includes(child)) {
                continue;
            }
            const oldChildScore = scores.get(child.id);
            const newChildScore = scoreFunc({
                node: child,
                pathDistance: currentPathDistance + distance
            });
            if (oldChildScore === undefined || newChildScore < oldChildScore) {
                pathDistances.set(child.id, currentPathDistance + distance);
                scores.set(child.id, newChildScore);
                parents.set(child.id, current);
                fringe.queue(child);
            }
        }
    }
    return { expanded };
}

function distanceBetween(a: GraphNode, b: GraphNode) {
    return Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lng - b.lng, 2));
}

function overpassToGraphNodes({ elements }: OverpassJSON) {
    const graphNodes: GraphNode[] = [];
    for (const { nodes, geometry, tags: { junction } } of elements) {
        let prevGraphNode: GraphNode;
        let firstGraphNode: GraphNode;
        nodes.forEach((nodeId, i) => {
            let graphNode = graphNodes.find(graphNode => graphNode.id === nodeId);
            if (graphNode === undefined) {
                graphNode = {
                    id: nodeId,
                    lat: geometry[i].lat,
                    lng: geometry[i].lon,
                    connections: [] as Connection[]
                };
                graphNodes.push(graphNode);
            }
            if (i === 0) {
                firstGraphNode = graphNode;
            } else {
                connect(graphNode, prevGraphNode);
            }
            if (i === nodes.length - 1 && junction === 'roundabout') {
                connect(graphNode, firstGraphNode);
            }
            prevGraphNode = graphNode;
        });
    }
    return graphNodes;
    function connect(a: GraphNode, b: GraphNode) {
        const distance = distanceBetween(a, b);
        a.connections.push({ distance, child: b });
        b.connections.push({ distance, child: a });
    }
}