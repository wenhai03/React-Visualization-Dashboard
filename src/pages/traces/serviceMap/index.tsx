import React, { useState, useEffect, useRef } from 'react';
import _ from 'lodash';
import { useHistory, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import G6 from '@antv/g6';
import { CloseOutlined, SecurityScanOutlined, RollbackOutlined } from '@ant-design/icons';
import { Spin, Select, Row, Col, Button, Popover, Empty, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { conversionTime } from '../utils';
import { iconForNode } from '../utils/getIcon';
import { getServiceMap, getServiceMapNode, getServiceMapSpan } from '@/services/traces';
import AbbreviatedChart from '@/components/AbbreviatedChart';
import Filter from './Filter';
import '../locale';
import './index.less';

const { uniqueId } = G6.Util;

const ServiceMap: React.FC = () => {
  const { t } = useTranslation('traces');
  const history = useHistory();
  const { search } = useLocation();
  const [currentNode, setCurrentNode] = useState<any>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<any>();
  // 进入聚焦地图
  const [detailVisible, setDetailVisible] = useState(false);
  const graph = useRef<any>(null);
  const params = queryString.parse(search) as Record<string, string>;
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<{ start: number; end: number }>();
  const filterRef = useRef<any>(null);
  const serviceMapRef = useRef<any>(null);
  const detailRef = useRef(null);
  const [graphData, setGraphData] = useState<any>(null);
  // 用于在触发第二次请求时，第一次还没结束时，终止掉第一次请求
  const controller = useRef<any>(null);
  const NODESIZEMAPPING = 'degree';
  const SMALLGRAPHLABELMAXLENGTH = 5;
  let labelMaxLength = SMALLGRAPHLABELMAXLENGTH;
  const DEFAULTNODESIZE = 20;
  const DEFAULTAGGREGATEDNODESIZE = 30;

  let currentUnproccessedData = { nodes: [], edges: [] };
  let aggregatedNodeMap = {};
  let CANVAS_WIDTH = 800,
    CANVAS_HEIGHT = 800;

  const duration = 2000;
  const animateOpacity = 0.6;
  const realEdgeOpacity = 0.6;

  const darkBackColor = '#FFFFFF';
  const disableColor = '#777';
  const theme = 'default';
  const subjectColors = ['#5F95FF'];

  const colorSets = G6.Util.getColorSetsBySubjectColors(subjectColors, darkBackColor, theme, disableColor);

  const global = {
    node: {
      style: {
        fill: '#2B384E',
      },
      stateStyles: {
        focus: {
          fill: '#2B384E',
        },
      },
    },
    edge: {
      style: {
        stroke: '#999',
        realEdgeStroke: '#999',
        realEdgeOpacity,
        strokeOpacity: realEdgeOpacity,
      },
      stateStyles: {
        focus: {
          stroke: '#262626',
        },
      },
    },
  };

  const onRedirection = (formData) => {
    history.replace({
      pathname: '/service-map',
      search: `?data_id=${formData.data_id}&bgid=${formData.bgid}&environment=${formData.environment}&start=${formData.start}&end=${formData.end}&contrast_time=${formData.contrast_time}`,
    });
  };

  const onRefresh = (params) => {
    // 终止上一个请求
    if (controller.current) {
      controller.current.abort();
    }
    destroyGraph(graph.current);
    const { data_id, bgid, start: startTime, end: endTime, environment } = params;
    const timeRange = conversionTime(startTime, endTime);
    setTimeRange(timeRange);
    let requestParams: any = {
      busi_group_id: Number(bgid),
      datasource_id: Number(data_id),
      service_environment: environment,
      ...timeRange,
    };
    if (params.service_name) {
      requestParams.service_name = params.service_name;
    }
    setLoading(true);
    controller.current = new AbortController();
    const signal = controller.current.signal;

    getServiceMap(requestParams, signal)
      .then((res) => {
        setGraphData(res.dat);
        setLoading(false);
      })
      .catch((err) => {
        // 检查是否是因为请求被取消
        if (err.name === 'AbortError') {
          console.log('请求已被取消');
        } else {
          setLoading(false);
          console.error(err);
        }
      });
  };

  const handleSearchNode = (e) => {
    if (graph.current) {
      // 高亮搜索的节点
      const nodes = graph.current.getNodes();
      const matchNode = nodes.find((node) => node._cfg.id === e);
      if (matchNode) {
        clearFocusItemState(graph.current);
        graph.current.setItemState(matchNode, 'focus', true);
        const relatedEdges = matchNode.getEdges();
        const relatedNodes = relatedEdges
          .map((edge) => edge.get('source'))
          .concat(relatedEdges.map((edge) => edge.get('target')));
        // 将相关边高亮
        relatedEdges.forEach((edge) => {
          graph.current.setItemState(edge, 'focus', true);
        });
        // 将相关节点高亮
        relatedNodes.forEach((node) => {
          graph.current.setItemState(node, 'focus', true);
        });
        // 被搜索节点聚焦在画布中心
        graph.current.focusItem(matchNode, true, {
          easing: 'easeCubic',
          duration: 500,
        });
      }
    }
  };

  const handleClearNode = () => {
    clearFocusItemState(graph.current);
  };

  // Custom super node
  G6.registerNode(
    'aggregated-node',
    {
      draw(cfg: any, group: any) {
        let width = 30,
          height = 30;
        const style = cfg.style || {};

        // 节点基础设置
        const keyShape = group.addShape('rect', {
          attrs: {
            ...style,
            x: -width / 2,
            y: -height / 2,
            width,
            height: height + 10,
            fill: '#FFFFFF',
            cursor: 'pointer',
            radius: cfg['service.name'] ? width / 2 : 0,
          },
          mustFill: true,
          name: 'aggregated-node-keyShape',
        });

        group.addShape('rect', {
          attrs: {
            ...style,
            x: -width / 2,
            y: -height / 2,
            width,
            height,
            fill: '#FFFFFF',
            stroke: '#98a2b3',
            lineWidth: 2,
            cursor: 'pointer',
            radius: cfg['service.name'] ? width / 2 : 0,
          },
          capture: false,
          name: 'aggregated-node-content',
        });

        // 添加背景图片
        group.addShape('image', {
          attrs: {
            x: (-width * 0.8) / 2,
            y: (-height * 0.8) / 2,
            width: width * 0.8,
            height: height * 0.8,
            img: iconForNode(cfg),
          },
          capture: false,
          name: 'image-shape',
        });

        group.addShape('text', {
          attrs: {
            text: cfg.label,
            x: 0,
            y: 28,
            textAlign: 'center',
            textBaseline: 'middle',
            cursor: 'pointer',
            fontSize: 12,
            fill: '#262626',
            opacity: 0.85,
            fontWeight: 400,
          },
          name: 'count-shape',
          className: 'count-shape',
          draggable: true,
        });

        // cfg.external===true 挂靠服务，没有权限
        if (cfg['service.name'] && !cfg.external) {
          // 计算环形进度条相关参数
          const annulusRadius = (width + 8) / 2; // 外圈半径
          const lineWidth = 3; // 进度条宽度
          const startAngle = -Math.PI / 2; // 进度条起始角度
          const failureRate = cfg.failure_rate || 0.00001;
          const successRate = 1 - failureRate;

          // 成功率部分角度范围
          const successStartAngle = startAngle;
          const successEndAngle = successStartAngle + successRate * 2 * Math.PI;

          // 失败率部分角度范围
          const failureStartAngle = successEndAngle;
          const failureEndAngle = failureStartAngle + failureRate * 2 * Math.PI;

          // 绘制环形进度条路径

          // 成功率描边
          group.addShape('path', {
            attrs: {
              path: [
                [
                  'M',
                  Math.cos(successStartAngle) * (annulusRadius + lineWidth / 2),
                  Math.sin(successStartAngle) * (annulusRadius + lineWidth / 2),
                ],
                [
                  'A',
                  annulusRadius + lineWidth / 2,
                  annulusRadius + lineWidth / 2,
                  0,
                  +(successEndAngle - successStartAngle > Math.PI),
                  1,
                  Math.cos(successEndAngle) * (annulusRadius + lineWidth / 2),
                  Math.sin(successEndAngle) * (annulusRadius + lineWidth / 2),
                ],
              ],
              stroke: '#52c41a', // 成功部分描边为绿色
              lineWidth,
            },
            name: 'success-stroke',
          });

          // 失败率描边
          group.addShape('path', {
            attrs: {
              path: [
                [
                  'M',
                  Math.cos(failureStartAngle) * (annulusRadius + lineWidth / 2),
                  Math.sin(failureStartAngle) * (annulusRadius + lineWidth / 2),
                ],
                [
                  'A',
                  annulusRadius + lineWidth / 2,
                  annulusRadius + lineWidth / 2,
                  0,
                  +(failureEndAngle - failureStartAngle > Math.PI),
                  1,
                  Math.cos(failureEndAngle) * (annulusRadius + lineWidth / 2),
                  Math.sin(failureEndAngle) * (annulusRadius + lineWidth / 2),
                ],
              ],
              stroke: '#f5222d', // 失败部分描边为红色
              lineWidth,
            },
            name: 'failure-stroke',
          });
        }

        return keyShape;
      },
      setState: (name, value, item: any) => {
        const group = item.get('group');
        if (name === 'layoutEnd' && value) {
          const labelShape = group.find((e) => e.get('name') === 'text-shape');
          if (labelShape) labelShape.set('visible', true);
        } else if (name === 'hover') {
          if (item.hasState('focus')) {
            return;
          }
          const shape = group.find((e) => e.get('name') === 'aggregated-node-content');
          const textShap = group.find((e) => e.get('name') === 'count-shape');
          if (value) {
            shape && shape.attr('stroke', '#262626');
            shape && shape.attr('lineWidth', 3);
            textShap && textShap.attr('text', item._cfg.id);
          } else {
            shape && shape.attr('stroke', '#98a2b3');
            shape && shape.attr('lineWidth', 2);
            textShap && textShap.attr('text', formatText(item._cfg.id, labelMaxLength, '...'));
          }
        } else if (name === 'focus') {
          const shape = group.find((e) => e.get('name') === 'aggregated-node-content');
          const textShap = group.find((e) => e.get('name') === 'count-shape');
          if (value) {
            shape && shape.attr('stroke', '#1890ff');
            shape && shape.attr('lineWidth', 3);
            textShap && textShap.attr('text', item._cfg.id);
          } else {
            shape && shape.attr('stroke', '#98a2b3');
            shape && shape.attr('lineWidth', 2);
            textShap && textShap.attr('text', formatText(item._cfg.id, labelMaxLength, '...'));
          }
        }
      },
    },
    'single-node',
  );

  // 单边
  G6.registerEdge(
    'custom-line',
    {
      setState: (name, value, item: any) => {
        const group = item.get('group');
        const model = item.getModel();
        const keyShape = group.find((ele) => ele.get('name') === 'edge-shape');
        if (name === 'focus') {
          const back = group.find((ele) => ele.get('name') === 'back-line');
          if (back) {
            back.stopAnimate();
            back.remove();
            back.destroy();
          }
          const arrow = model.style.endArrow;
          if (value) {
            if (keyShape.cfg.animation) {
              keyShape.stopAnimate(true);
            }
            keyShape.attr({
              strokeOpacity: animateOpacity,
              opacity: animateOpacity,
              stroke: '#1890ff',
              endArrow: {
                ...arrow,
                stroke: '#1890ff',
                fill: '#1890ff',
              },
            });
            const lineDash = keyShape.attr('lineDash');
            const totalLength = lineDash[0] + lineDash[1];
            let index = 0;
            keyShape.animate(
              () => {
                index++;
                if (index > totalLength) {
                  index = 0;
                }
                const res = {
                  lineDash,
                  lineDashOffset: -index,
                };
                return res;
              },
              {
                repeat: true, // whether executes the animation repeatly
                duration, // the duration for executing once
              },
            );
          } else {
            keyShape.stopAnimate();
            const stroke = '#999';
            const opacity = realEdgeOpacity;
            keyShape.attr({
              stroke,
              strokeOpacity: opacity,
              opacity: opacity,
              endArrow: {
                ...arrow,
                stroke,
                fill: stroke,
              },
            });
          }
        } else if (name === 'hover') {
          if (item.hasState('focus')) {
            return;
          }
          const arrow = model.style.endArrow;
          if (value) {
            keyShape.attr({
              strokeOpacity: animateOpacity,
              opacity: animateOpacity,
              stroke: '#262626',
              endArrow: {
                ...arrow,
                stroke: '#262626',
                fill: '#262626',
              },
            });
          } else {
            keyShape.stopAnimate();
            const stroke = '#999';
            const opacity = realEdgeOpacity;
            keyShape.attr({
              stroke,
              strokeOpacity: opacity,
              opacity: opacity,
              endArrow: {
                ...arrow,
                stroke,
                fill: stroke,
              },
            });
          }
        }
      },
    },
    'single-edge',
  );
  // 双边
  G6.registerEdge(
    'custom-quadratic',
    {
      setState: (name, value, item: any) => {
        const group = item.get('group');
        const model = item.getModel();
        const keyShape = group.find((ele) => ele.get('name') === 'edge-shape');
        if (name === 'focus') {
          const back = group.find((ele) => ele.get('name') === 'back-line');
          if (back) {
            back.stopAnimate();
            back.remove();
            back.destroy();
          }
          const arrow = model.style.endArrow;
          if (value) {
            if (keyShape.cfg.animation) {
              keyShape.stopAnimate(true);
            }
            keyShape.attr({
              strokeOpacity: animateOpacity,
              opacity: animateOpacity,
              stroke: '#1890ff',
              endArrow: {
                ...arrow,
                stroke: '#1890ff',
                fill: '#1890ff',
              },
            });
            let index = 0;
            const lineDash = keyShape.attr('lineDash');
            const totalLength = lineDash[0] + lineDash[1];
            keyShape.animate(
              () => {
                index++;
                if (index > totalLength) {
                  index = 0;
                }
                const res = {
                  lineDash,
                  lineDashOffset: -index,
                };
                return res;
              },
              {
                repeat: true,
                duration,
              },
            );
          } else {
            keyShape.stopAnimate();
            const stroke = '#999';
            const opacity = realEdgeOpacity;
            keyShape.attr({
              stroke,
              strokeOpacity: opacity,
              opacity,
              endArrow: {
                ...arrow,
                stroke,
                fill: stroke,
              },
            });
          }
        } else if (name === 'hover') {
          if (item.hasState('focus')) {
            return;
          }
          const arrow = model.style.endArrow;
          if (value) {
            keyShape.attr({
              strokeOpacity: animateOpacity,
              opacity: animateOpacity,
              stroke: '#262626',
              endArrow: {
                ...arrow,
                stroke: '#262626',
                fill: '#262626',
              },
            });
          } else {
            keyShape.stopAnimate();
            const stroke = '#999';
            const opacity = realEdgeOpacity;
            keyShape.attr({
              stroke,
              strokeOpacity: opacity,
              opacity: opacity,
              endArrow: {
                ...arrow,
                stroke,
                fill: stroke,
              },
            });
          }
        }
      },
    },
    'quadratic',
  );

  // 小地图
  const minimap = new G6.Minimap({
    size: [150, 100],
  });

  const descendCompare = (p) => {
    // 这是比较函数
    return function (m, n) {
      const a = m[p];
      const b = n[p];
      return b - a; // 降序
    };
  };

  const clearFocusItemState = (graph) => {
    if (!graph) return;
    clearFocusNodeState(graph);
    clearFocusEdgeState(graph);
  };

  // 清除图上所有节点的 focus 状态及相应样式
  const clearFocusNodeState = (graph) => {
    const focusNodes = graph.findAllByState('node', 'focus');
    focusNodes.forEach((fnode) => {
      graph.setItemState(fnode, 'focus', false); // false
    });
  };

  // 清除图上所有边的 focus 状态及相应样式
  const clearFocusEdgeState = (graph) => {
    const focusEdges = graph.findAllByState('edge', 'focus');
    focusEdges.forEach((fedge) => {
      graph.setItemState(fedge, 'focus', false);
    });
  };

  // 截断长文本。length 为文本截断后长度，elipsis 是后缀
  const formatText = (text, length = 5, elipsis = '...') => {
    if (!text) return '';
    if (text.length > length) {
      return `${text.substr(0, length)}${elipsis}`;
    }
    return text;
  };

  const processNodesEdges = (nodes, edges) => {
    if (!nodes || nodes.length === 0) return {};
    const currentNodeMap = {};
    let maxNodeCount = -Infinity;
    nodes.forEach((node) => {
      node.type = 'aggregated-node';
      node.isReal = node.level === 0 ? true : false;
      node.label = `${node.id}`;
      node.labelLineNum = undefined;
      node.oriLabel = node.label;
      node.label = formatText(node.label, labelMaxLength, '...');
      node.degree = 0;
      node.inDegree = 0;
      node.outDegree = 0;
      if (currentNodeMap[node.id]) {
        console.warn('node exists already!', node.id);
        node.id = `${node.id}${Math.random()}`;
      }
      currentNodeMap[node.id] = node;
      if (node.count > maxNodeCount) maxNodeCount = node.count;
    });

    let maxCount = -Infinity;
    let minCount = Infinity;
    edges.forEach((edge) => {
      if (!edge.id) edge.id = uniqueId('edge');
      else if (edge.id.split('-')[0] !== 'edge') edge.id = `edge-${edge.id}`;
      if (!currentNodeMap[edge.source] || !currentNodeMap[edge.target]) {
        console.warn('edge source target does not exist', edge.source, edge.target, edge.id);
        return;
      }
      const sourceNode = currentNodeMap[edge.source];
      const targetNode = currentNodeMap[edge.target];

      if (!sourceNode || !targetNode) console.warn('source or target is not defined!!!', edge, sourceNode, targetNode);

      sourceNode.degree++;
      targetNode.degree++;
      sourceNode.outDegree++;
      targetNode.inDegree++;

      if (edge.count > maxCount) maxCount = edge.count;
      if (edge.count < minCount) minCount = edge.count;
    });

    nodes.sort(descendCompare(NODESIZEMAPPING));
    const maxDegree = nodes[0].degree || 1;

    const descreteNodes: any = [];
    nodes.forEach((node, i) => {
      const countRatio = node.count / maxNodeCount;
      const isRealNode = node.level === 0;
      node.size = isRealNode ? DEFAULTNODESIZE : DEFAULTAGGREGATEDNODESIZE;
      node.isReal = isRealNode;
      node.labelCfg = {
        position: 'bottom',
        offset: 5,
        style: {
          fontSize: 6 + countRatio * 6 || 12,
          lineWidth: 3,
        },
      };

      // 处理没有连线的节点
      if (!node.degree) {
        descreteNodes.push(node);
      }
    });

    // 设置连接线的粗细
    const minThickness = 1;
    const maxThickness = 7;
    edges.forEach((edge) => {
      const targetNode = currentNodeMap[edge.target];
      const size =
        ((maxThickness - minThickness) *
          ((edge.size - graphData.min_size) / (graphData.max_size - graphData.min_size)) +
          minThickness) |
        1;
      edge.size = size;

      const arrowWidth = Math.max(size / 2 + 2, 3);
      const arrowLength = 10;
      const nodeSize = targetNode.size + 20;
      const arrowBeging = nodeSize + arrowLength;
      let arrowPath: any = `M ${arrowBeging},0 L ${arrowBeging + arrowLength},-${arrowWidth} L ${
        arrowBeging + arrowLength
      },${arrowWidth} Z`;
      let d = nodeSize / 2 + arrowLength;
      if (edge.source === edge.target) {
        edge.type = 'loop';
        arrowPath = undefined;
      }
      const sourceNode = currentNodeMap[edge.source];
      const isRealEdge = targetNode.isReal && sourceNode.isReal;
      edge.isReal = isRealEdge;
      const stroke = isRealEdge ? global.edge.style.realEdgeStroke : global.edge.style.stroke;
      const opacity = isRealEdge ? global.edge.style.realEdgeOpacity : global.edge.style.strokeOpacity;
      const dash = Math.max(size, 2);
      const lineDash = isRealEdge ? undefined : [dash, dash];
      edge.style = {
        stroke,
        strokeOpacity: opacity,
        lineAppendWidth: Math.max(edge.size || 5, 5),
        fillOpacity: 1,
        lineDash,
        endArrow: arrowPath
          ? {
              path: arrowPath,
              d,
              fill: stroke,
              strokeOpacity: 0,
            }
          : false,
      };
      edge.label = '';
    });

    G6.Util.processParallelEdges(edges, 30, 'custom-quadratic', 'custom-line');
    return {
      maxDegree,
      edges,
    };
  };

  const examAncestors = (model, expandedArray, length, keepTags) => {
    for (let i = 0; i < length; i++) {
      const expandedNode = expandedArray[i];
      if (!keepTags[i] && model.parentId === expandedNode.id) {
        keepTags[i] = true; // 需要被保留
        examAncestors(expandedNode, expandedArray, length, keepTags);
        break;
      }
    }
  };

  const bindListener = (graph) => {
    graph.on('node:mouseenter', (evt) => {
      const { item } = evt;
      item.toFront();
      const relatedEdges = item.getEdges();
      const relatedNodes = relatedEdges
        .map((edge) => edge.get('source'))
        .concat(relatedEdges.map((edge) => edge.get('target')));
      // 相关边高亮
      relatedEdges.forEach((edge) => {
        graph.setItemState(edge, 'hover', true);
      });
      // 将相关节点高亮
      relatedNodes.forEach((node) => {
        graph.setItemState(node, 'hover', true);
      });
    });

    graph.on('node:mouseleave', (evt) => {
      const { item } = evt;
      // 将相关边也取消高亮
      const relatedEdges = item.getEdges();
      const relatedNodes = relatedEdges
        .map((edge) => edge.get('source'))
        .concat(relatedEdges.map((edge) => edge.get('target')));
      relatedEdges.forEach((edge) => {
        graph.setItemState(edge, 'hover', false);
      });
      relatedNodes.forEach((node) => {
        graph.setItemState(node, 'hover', false);
      });
    });

    graph.on('node:click', (evt) => {
      clearFocusItemState(graph);
      const { item } = evt;
      const model = item.getModel();
      // external 是否是挂靠服务，true 是挂靠，没权限，false：非挂靠，有权限
      const hasMenu = !model.external;
      // highlight the clicked node, it is down by click-select
      graph.setItemState(item, 'focus', true);

      const relatedEdges = item.getEdges();
      const relatedNodes = relatedEdges
        .map((edge) => edge.get('source'))
        .concat(relatedEdges.map((edge) => edge.get('target')));
      // 相关边高亮
      relatedEdges.forEach((edge) => {
        graph.setItemState(edge, 'focus', true);
      });
      // 相关节点高亮
      relatedNodes.forEach((node) => {
        graph.setItemState(node, 'focus', true);
      });

      if (Boolean(hasMenu)) {
        handleMenuClick({ ...model, x: evt.clientX, y: evt.clientY });
      } else {
        setDetailVisible(false);
        setCurrentNode(undefined);
        setDetail(undefined);
      }
    });

    graph.on('canvas:click', (evt) => {
      clearFocusItemState(graph);
      setDetailVisible(false);
      setCurrentNode(undefined);
      setDetail(undefined);
    });
  };

  const renderGraph = () => {
    CANVAS_WIDTH = serviceMapRef.current.scrollWidth;
    CANVAS_HEIGHT = serviceMapRef.current.scrollHeight || 500;
    const aggregatedData = { nodes: [], edges: [] };
    aggregatedData.nodes = graphData.nodes.map((node, i) => {
      aggregatedNodeMap[node.id] = node;
      return {
        ...node,
        colorSet: colorSets[0],
      };
    });
    aggregatedData.edges = graphData.edges.map((edge, i) => ({
      ...edge,
      level: 1,
    }));

    currentUnproccessedData = aggregatedData;
    const { edges: processedEdges } = processNodesEdges(currentUnproccessedData.nodes, currentUnproccessedData.edges);

    graph.current = new G6.Graph({
      container: serviceMapRef.current,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      layout: {
        animate: false,
        edgeStrength: 50,
        linkDistance: 255,
        nodeSize: 50,
        nodeSpacing: 5,
        preventOverlap: true,
        type: 'gForce',
      },
      modes: {
        default: [
          {
            type: 'drag-canvas',
          },
          {
            type: 'zoom-canvas',
            optimizeZoom: 0.01,
          },
          'drag-node',
        ],
      },
      defaultNode: {
        type: 'aggregated-node',
        size: DEFAULTNODESIZE,
      },
      plugins: [minimap],
    });

    bindListener(graph.current);
    graph.current.data({ nodes: aggregatedData.nodes, edges: processedEdges });
    graph.current.render();
  };

  const destroyGraph = (graph) => {
    if (graph) {
      graph.destroy();
    }
  };

  useEffect(() => {
    destroyGraph(graph.current);
    if (graphData?.nodes?.length) {
      renderGraph();
    }
  }, [graphData]);

  // 打开菜单栏
  const handleMenuClick = (model) => {
    setDetailVisible(true);
    const { data_id, bgid, environment, contrast_time } = params;
    const requestParams = {
      busi_group_id: Number(bgid),
      datasource_id: Number(data_id),
      service_environment: environment,
      ...timeRange,
      contrast_time: Number(contrast_time),
    };
    setCurrentNode(model);

    // 请求详情数据
    setDetailLoading(true);
    if (model['service.name'] === '') {
      // span
      getServiceMapSpan({ ...requestParams, dependency_name: model['span.destination.service.resource'] })
        .then((res) => {
          setDetailLoading(false);
          setDetail(res.dat);
        })
        .catch((err) => setDetailLoading(false));
    } else {
      // node
      getServiceMapNode({ ...requestParams, service_name: model['service.name'] })
        .then((res) => {
          setDetailLoading(false);
          setDetail(res.dat);
        })
        .catch((err) => setDetailLoading(false));
    }
  };
  useEffect(() => {
    setDetailVisible(false);
  }, [search]);

  return (
    <PageLayout
      title={params.service_name ? `${t('service_map.title')}（服务：${params.service_name}）` : t('service_map.title')}
      icon={
        Boolean(params.service_name) && (
          <RollbackOutlined
            className='back'
            onClick={() =>
              history.push(
                `/service-map?data_id=${params.data_id}&bgid=${params.bgid}&environment=${params.environment}&start=${params.start}&end=${params.end}&contrast_time=${params.contrast_time}`,
              )
            }
          />
        )
      }
    >
      <div>
        <div className='service-map-wrapper'>
          <Popover
            placement='topLeft'
            title={null}
            content={
              <Select
                showSearch
                allowClear
                optionFilterProp='children'
                filterOption={(input, option: any) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={graphData?.nodes
                  ?.map((item) => ({ value: item.id, label: item.id }))
                  ?.sort((a, b) => a.value.localeCompare(b.value))}
                placeholder='查找节点'
                style={{ width: '300px' }}
                onSelect={handleSearchNode}
                onClear={handleClearNode}
              />
            }
            trigger='click'
          >
            <Button className='service-map-node-search' type='primary' shape='circle' icon={<SecurityScanOutlined />} />
          </Popover>

          <div ref={filterRef}>
            <Filter
              onRedirection={onRedirection}
              onRefresh={onRefresh}
              searchPlaceholder='搜索事务、错误和指标（例如 transaction.duration.us > 300000 AND http.response.status_code >= 400）'
            />
          </div>
          <Spin spinning={loading}>
            <div
              ref={serviceMapRef}
              style={{ height: `calc(100vh - ${96 + filterRef?.current?.clientHeight ?? 0}px)` }}
            >
              {graphData?.nodes?.length ? null : (
                <div className='empty-wrapper'>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
              )}
            </div>
            {detailVisible && currentNode && (
              <div
                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                className='service-map-wrapper-detail'
                ref={detailRef}
              >
                <Row justify='space-between' className='service-wrapper-header'>
                  <Col>
                    {currentNode['service.name'] !== ''
                      ? currentNode['service.name']
                      : currentNode['span.destination.service.resource']}
                  </Col>
                  <Col>
                    <CloseOutlined
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setDetailVisible(false);
                        setCurrentNode(undefined), setDetail(undefined);
                      }}
                    />
                  </Col>
                </Row>

                <div className='service-wrapper-content'>
                  <Spin spinning={detailLoading} style={{ width: '100%', height: '200px', lineHeight: '200px' }}>
                    {detail &&
                      detail.current.map(({ name, value, timeseries }, index) => (
                        <>
                          {name === 'latency' && (
                            <Row gutter={8} align='middle' style={{ margin: '7px 0' }}>
                              <Col span={11}>Latency (avg.)</Col>
                              <Col span={7} style={{ textAlign: 'right' }}>
                                {(value / 1000).toFixed(1)} ms
                              </Col>
                              <Col span={6}>
                                <AbbreviatedChart
                                  now={timeseries}
                                  contrast={detail.contrast?.[index]?.timeseries}
                                  nowColor='#6a99c3'
                                  contrastColor='#c1d9ed'
                                />
                              </Col>
                            </Row>
                          )}
                          {name === 'throughput' && (
                            <Row gutter={8} align='middle' style={{ margin: '7px 0' }}>
                              <Col span={11}>Throughput (avg.)</Col>
                              <Col span={7} style={{ textAlign: 'right' }}>
                                {value.toFixed(1)} tpm
                              </Col>
                              <Col span={6}>
                                <AbbreviatedChart
                                  now={timeseries}
                                  contrast={detail.contrast?.[index]?.timeseries}
                                  nowColor='#54b399'
                                  contrastColor='#aad9cc'
                                />
                              </Col>
                            </Row>
                          )}
                          {name === 'failedTransactionsRate' && (
                            <Row gutter={8} align='middle' style={{ margin: '7px 0' }}>
                              <Col span={14}>Failed transaction rate (avg.)</Col>
                              <Col span={4} style={{ textAlign: 'right' }}>
                                {(value * 100).toFixed(1)} %
                              </Col>
                              <Col span={6}>
                                <AbbreviatedChart
                                  now={value.timeseries}
                                  contrast={detail.contrast?.[index]?.timeseries}
                                />
                              </Col>
                            </Row>
                          )}
                          {name === 'cpuUsage' && (
                            <Row gutter={8} align='middle' style={{ margin: '7px 0' }}>
                              <Col span={14}>CPU usage (avg.)</Col>
                              <Col span={4} style={{ textAlign: 'right' }}>
                                {(value * 100).toFixed(1)} %
                              </Col>
                              <Col span={6}>
                                <AbbreviatedChart
                                  now={value.timeseries}
                                  contrast={detail.contrast?.[index]?.timeseries}
                                  nowColor='#9170b8'
                                  contrastColor='#ded4ea'
                                />
                              </Col>
                            </Row>
                          )}
                          {name === 'memoryUsage' && (
                            <Row gutter={8} align='middle' style={{ margin: '7px 0' }}>
                              <Col span={14}>Memory usage (avg.)</Col>
                              <Col span={4} style={{ textAlign: 'right' }}>
                                {(value * 100).toFixed(1)} %
                              </Col>
                              <Col span={6}>
                                <AbbreviatedChart
                                  now={value.timeseries}
                                  contrast={detail.contrast?.[index]?.timeseries}
                                  nowColor='#f583b7'
                                  contrastColor='#fcdcea'
                                />
                              </Col>
                            </Row>
                          )}
                        </>
                      ))}
                  </Spin>
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <Button
                      type='primary'
                      block
                      size='large'
                      onClick={() =>
                        history.push(
                          `/service-tracking/overview?data_id=${params.data_id}&bgid=${params.bgid}&serviceName=${currentNode?.['service.name']}&transactionType=&environment=${params.environment}&start=${params.start}&end=${params.end}&filter=&contrast_time=${params.contrast_time}&aggregation_type=avg`,
                        )
                      }
                    >
                      服务详情
                    </Button>
                    {!params.service_name && (
                      <Button
                        type='primary'
                        block
                        size='large'
                        ghost
                        onClick={() => {
                          setDetailVisible(false);
                          history.push(
                            `/service-map?data_id=${params.data_id}&bgid=${params.bgid}&environment=${params.environment}&start=${params.start}&end=${params.end}&contrast_time=${params.contrast_time}&service_name=${currentNode?.['service.name']}`,
                          );
                        }}
                      >
                        聚焦地图
                      </Button>
                    )}
                  </Space>
                </div>
              </div>
            )}
          </Spin>
        </div>
      </div>
    </PageLayout>
  );
};

export default ServiceMap;
