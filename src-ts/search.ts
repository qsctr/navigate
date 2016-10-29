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

interface Connection {
    readonly distance: Distance;
    readonly child: GraphNode;
}

type ScoringFunction = (info: {
    node: GraphNode;
    parentScore: Score;
    distance: Distance;
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

type SearchFunction = (start: GraphNode, goal: GraphNode) => {
    expanded: GraphNode[],
    path: GraphNode[]
} | null;

const uniformCostSearch: SearchFunction = (start, goal) =>
    bestFirstSearch(start, goal, ({ parentScore, distance }) => parentScore + distance);

const greedySearch: SearchFunction = (start, goal) =>
    bestFirstSearch(start, goal, ({ node }) => distanceBetween(node, goal));

const aStarSearch: SearchFunction = (start, goal) =>
    bestFirstSearch(start, goal, ({ node, parentScore, distance }) =>
        parentScore + distance + distanceBetween(node, goal));

function bestFirstSearch(start: GraphNode, goal: GraphNode, scoreFunc: ScoringFunction) {
    const expanded: GraphNode[] = [];
    const scores = new Map<Id, Score>([[start.id, scoreFunc({
        node: start,
        parentScore: 0,
        distance: 0
    })]]);
    const parents = new Map<GraphNode, GraphNode>();
    const fringe = new PriorityQueue<GraphNode>({
        comparator: (a: GraphNode, b: GraphNode) => scores.get(a.id) - scores.get(b.id),
        initialValues: [start]
    });
    while (fringe.length > 0) {
        const current = fringe.dequeue();
        const currentScore = scores.get(current.id) as Score;
        expanded.push(current);
        for (const { distance, child } of current.connections) {
            if (expanded.includes(child)) {
                continue;
            }
            if (child === goal) {
                expanded.push(child);
                const path = [current, goal];
                let parent = current;
                while (parent !== start) {
                    parent = parents.get(parent) as GraphNode;
                    path.unshift(parent);
                }
                return { expanded, path };
            }
            parents.set(child, current);
            const oldChildScore = scores.get(child.id);
            const newChildScore = scoreFunc({
                node: child,
                parentScore: currentScore,
                distance
            });
            if (oldChildScore === undefined || newChildScore < oldChildScore) {
                scores.set(child.id, newChildScore);
                fringe.queue(child);
            }
        }
    }
    return null;
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
    function connect(a: GraphNode, b: GraphNode) {
        const distance = distanceBetween(a, b);
        a.connections.push({ distance, child: b });
        b.connections.push({ distance, child: a });
    }
    return graphNodes;
}