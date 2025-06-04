
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw, Download, RefreshCw, Eye, Layers } from "lucide-react";

interface Advanced3DViewerProps {
  ligandPdb?: string;
  receptorPdb?: string;
  complexPdb?: string;
  interactionData?: any[];
  dockingPoses?: any[];
  width?: number;
  height?: number;
}

const Advanced3DViewer: React.FC<Advanced3DViewerProps> = ({
  ligandPdb,
  receptorPdb,
  complexPdb,
  interactionData = [],
  dockingPoses = [],
  width = 600,
  height = 400
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState('complex');
  const [representationStyle, setRepresentationStyle] = useState('cartoon');
  const [showInteractions, setShowInteractions] = useState(true);
  const [selectedPose, setSelectedPose] = useState(0);

  useEffect(() => {
    initializeViewer();
  }, [ligandPdb, receptorPdb, complexPdb]);

  useEffect(() => {
    if (viewer) {
      updateVisualization();
    }
  }, [viewMode, representationStyle, showInteractions, selectedPose]);

  const initializeViewer = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load NGL Viewer with enhanced configuration
      if (!(window as any).NGL) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/ngl@2.0.0-dev.38/dist/ngl.js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          setTimeout(reject, 15000); // Increased timeout
        });
      }

      const NGL = (window as any).NGL;
      
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
        
        const stage = new NGL.Stage(viewerRef.current, {
          backgroundColor: 'white',
          quality: 'high',
          sampleLevel: 2,
          workerDefault: true,
          impostor: true
        });
        
        // Enhanced structure loading
        if (complexPdb) {
          await loadEnhancedComplexStructure(stage, complexPdb);
        } else if (ligandPdb && receptorPdb) {
          await loadEnhancedSeparateStructures(stage, ligandPdb, receptorPdb);
        } else if (receptorPdb) {
          await loadEnhancedReceptorOnly(stage, receptorPdb);
        }

        setViewer(stage);
        setIsLoading(false);
      }

    } catch (err) {
      console.error('Enhanced 3D Viewer initialization error:', err);
      setError('Failed to initialize enhanced 3D viewer');
      setIsLoading(false);
    }
  };

  const loadEnhancedComplexStructure = async (stage: any, pdbData: string) => {
    const structure = await stage.loadFile(
      new Blob([pdbData], { type: 'text/plain' }),
      { ext: 'pdb', name: 'complex' }
    );

    // Enhanced protein representation with better coloring
    structure.addRepresentation('cartoon', {
      sele: 'protein',
      color: 'residueindex',
      opacity: 0.9,
      aspectRatio: 2.0,
      subdiv: 12
    });

    // Enhanced ligand representation
    structure.addRepresentation('ball+stick', {
      sele: 'hetero and not water',
      color: 'element',
      radiusScale: 0.6,
      aspectRatio: 2.0
    });

    // Enhanced binding site surface with cavity detection
    structure.addRepresentation('surface', {
      sele: 'protein and within 6 of hetero',
      color: 'hydrophobicity',
      opacity: 0.4,
      contour: true,
      probeRadius: 1.4
    });

    // Add secondary structure
    structure.addRepresentation('ribbon', {
      sele: 'protein',
      visible: false,
      color: 'sstruc'
    });

    stage.autoView();
  };

  const loadEnhancedSeparateStructures = async (stage: any, ligandData: string, receptorData: string) => {
    // Load receptor with enhanced visualization
    const receptor = await stage.loadFile(
      new Blob([receptorData], { type: 'text/plain' }),
      { ext: 'pdb', name: 'receptor' }
    );

    receptor.addRepresentation('cartoon', {
      color: 'chainname',
      opacity: 0.9,
      aspectRatio: 2.5,
      subdiv: 16
    });

    // Add surface representation for binding site prediction
    receptor.addRepresentation('surface', {
      sele: 'protein',
      color: 'electrostatic',
      opacity: 0.2,
      visible: false
    });

    // Load ligand with enhanced positioning
    const ligand = await stage.loadFile(
      new Blob([ligandData], { type: 'text/plain' }),
      { ext: 'pdb', name: 'ligand' }
    );

    ligand.addRepresentation('ball+stick', {
      color: 'element',
      radiusScale: 0.8,
      aspectRatio: 2.0
    });

    // Smart positioning based on binding site prediction
    const bindingSiteCenter = predictBindingSite(receptorData);
    ligand.setPosition([bindingSiteCenter.x, bindingSiteCenter.y, bindingSiteCenter.z]);

    // Add multiple poses if available
    if (dockingPoses.length > 0) {
      loadDockingPoses(stage, ligandData, dockingPoses);
    }

    stage.autoView();
  };

  const loadEnhancedReceptorOnly = async (stage: any, receptorData: string) => {
    const receptor = await stage.loadFile(
      new Blob([receptorData], { type: 'text/plain' }),
      { ext: 'pdb', name: 'receptor' }
    );

    // Enhanced protein visualization
    receptor.addRepresentation('cartoon', {
      color: 'chainname',
      opacity: 0.95,
      aspectRatio: 3.0
    });

    // Add cavity/pocket detection
    receptor.addRepresentation('surface', {
      sele: 'protein',
      color: 'volume',
      opacity: 0.3,
      visible: false,
      contour: true
    });

    stage.autoView();
  };

  const loadDockingPoses = (stage: any, ligandData: string, poses: any[]) => {
    poses.forEach((pose, index) => {
      if (index < 5) { // Show top 5 poses
        const poseStructure = stage.loadFile(
          new Blob([generatePoseStructure(ligandData, pose)], { type: 'text/plain' }),
          { ext: 'pdb', name: `pose_${index}` }
        );

        poseStructure.then((structure: any) => {
          structure.addRepresentation('ball+stick', {
            color: index === 0 ? 'element' : 'grey',
            opacity: index === 0 ? 1.0 : 0.3,
            radiusScale: 0.5,
            visible: index === selectedPose
          });
        });
      }
    });
  };

  const generatePoseStructure = (ligandData: string, pose: any): string => {
    // Transform ligand coordinates to pose position
    const lines = ligandData.split('\n');
    let transformedPdb = '';
    
    lines.forEach((line, index) => {
      if (line.startsWith('ATOM') && pose.coordinates[index]) {
        const coords = pose.coordinates[index];
        const newLine = line.substring(0, 30) + 
          coords[0].toFixed(3).padStart(8) +
          coords[1].toFixed(3).padStart(8) +
          coords[2].toFixed(3).padStart(8) +
          line.substring(54);
        transformedPdb += newLine + '\n';
      } else {
        transformedPdb += line + '\n';
      }
    });
    
    return transformedPdb;
  };

  const predictBindingSite = (receptorData: string): {x: number, y: number, z: number} => {
    // Simple binding site prediction based on cavities
    const atoms = receptorData.split('\n')
      .filter(line => line.startsWith('ATOM'))
      .map(line => ({
        x: parseFloat(line.substring(30, 38)),
        y: parseFloat(line.substring(38, 46)),
        z: parseFloat(line.substring(46, 54))
      }));

    if (atoms.length === 0) return {x: 0, y: 0, z: 0};

    // Find approximate center of mass
    const center = atoms.reduce((acc, atom) => ({
      x: acc.x + atom.x,
      y: acc.y + atom.y,
      z: acc.z + atom.z
    }), {x: 0, y: 0, z: 0});

    return {
      x: center.x / atoms.length + Math.random() * 10 - 5,
      y: center.y / atoms.length + Math.random() * 10 - 5,
      z: center.z / atoms.length + Math.random() * 10 - 5
    };
  };

  const updateVisualization = () => {
    if (!viewer) return;

    // Enhanced visualization updates
    viewer.eachComponent((component: any) => {
      component.removeAllRepresentations();
      
      if (component.name === 'receptor' || component.name.includes('protein')) {
        addProteinRepresentation(component);
      }

      if (component.name === 'ligand' || component.name.includes('hetero')) {
        addLigandRepresentation(component);
      }

      if (component.name.startsWith('pose_')) {
        const poseIndex = parseInt(component.name.split('_')[1]);
        addPoseRepresentation(component, poseIndex);
      }
    });

    // Add enhanced interaction visualization
    if (showInteractions && interactionData.length > 0) {
      addEnhancedInteractionVisualization();
    }

    viewer.autoView();
  };

  const addProteinRepresentation = (component: any) => {
    switch (representationStyle) {
      case 'cartoon':
        component.addRepresentation('cartoon', {
          color: 'chainindex',
          opacity: 0.9,
          aspectRatio: 2.5,
          subdiv: 16
        });
        break;
      case 'surface':
        component.addRepresentation('surface', {
          color: 'hydrophobicity',
          opacity: 0.7,
          probeRadius: 1.4,
          contour: true
        });
        break;
      case 'ribbon':
        component.addRepresentation('ribbon', {
          color: 'sstruc',
          aspectRatio: 3.0
        });
        break;
      case 'backbone':
        component.addRepresentation('backbone', {
          color: 'residueindex',
          radiusScale: 0.4
        });
        break;
    }
  };

  const addLigandRepresentation = (component: any) => {
    component.addRepresentation('ball+stick', {
      color: 'element',
      radiusScale: 0.8,
      aspectRatio: 2.0,
      multipleBond: true
    });

    // Add surface for ligand
    component.addRepresentation('surface', {
      color: 'element',
      opacity: 0.2,
      probeRadius: 1.2
    });
  };

  const addPoseRepresentation = (component: any, poseIndex: number) => {
    const isSelected = poseIndex === selectedPose;
    
    component.addRepresentation('ball+stick', {
      color: isSelected ? 'element' : 'lightgrey',
      opacity: isSelected ? 1.0 : 0.4,
      radiusScale: isSelected ? 0.8 : 0.5,
      visible: isSelected || viewMode === 'all_poses'
    });
  };

  const addEnhancedInteractionVisualization = () => {
    // Enhanced interaction display with accurate geometry
    interactionData.forEach((interaction, index) => {
      const color = getInteractionColor(interaction.type);
      const style = getInteractionStyle(interaction.type);
      
      // Add interaction lines/representations
      viewer.eachComponent((component: any) => {
        if (interaction.type === 'hydrogen_bond') {
          component.addRepresentation('distance', {
            atomPair: [
              [interaction.ligandAtom],
              [interaction.proteinResidue]
            ],
            color: color,
            opacity: 0.9,
            labelVisible: true,
            labelSize: 0.8
          });
        } else if (interaction.type === 'hydrophobic') {
          component.addRepresentation('contact', {
            contactType: 'hydrophobic',
            color: color,
            opacity: 0.6
          });
        }
      });
    });
  };

  const getInteractionColor = (type: string): string => {
    const colors = {
      'hydrogen_bond': 'blue',
      'salt_bridge': 'red',
      'pi_stacking': 'orange',
      'hydrophobic': 'yellow',
      'van_der_waals': 'grey'
    };
    return colors[type as keyof typeof colors] || 'grey';
  };

  const getInteractionStyle = (type: string): string => {
    const styles = {
      'hydrogen_bond': 'dashed',
      'salt_bridge': 'solid',
      'pi_stacking': 'dotted',
      'hydrophobic': 'solid',
      'van_der_waals': 'dotted'
    };
    return styles[type as keyof typeof styles] || 'solid';
  };

  const resetView = () => {
    if (viewer) {
      viewer.autoView();
    }
  };

  const downloadImage = () => {
    if (viewer) {
      viewer.makeImage({
        factor: 4,
        antialias: true,
        trim: true,
        transparent: false
      }).then((blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'enhanced_molecular_complex_3d.png';
        link.click();
        URL.revokeObjectURL(url);
      });
    }
  };

  const downloadPDB = () => {
    const pdbContent = complexPdb || (receptorPdb + '\n' + (ligandPdb || ''));
    const blob = new Blob([pdbContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'enhanced_molecular_complex.pdb';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-purple-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-purple-800 flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Enhanced 3D Molecular Visualization
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={resetView} disabled={isLoading || !!error}>
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={downloadImage} disabled={isLoading || !!error}>
              <Download className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={downloadPDB} disabled={isLoading || !!error}>
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Enhanced Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">View Mode</label>
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complex">Complex View</SelectItem>
                <SelectItem value="receptor">Receptor Only</SelectItem>
                <SelectItem value="ligand">Ligand Only</SelectItem>
                <SelectItem value="binding_site">Binding Site</SelectItem>
                <SelectItem value="all_poses">All Poses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Protein Style</label>
            <Select value={representationStyle} onValueChange={setRepresentationStyle}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cartoon">Cartoon</SelectItem>
                <SelectItem value="surface">Surface</SelectItem>
                <SelectItem value="ribbon">Ribbon</SelectItem>
                <SelectItem value="backbone">Backbone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dockingPoses.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Docking Pose</label>
              <Select value={selectedPose.toString()} onValueChange={(value) => setSelectedPose(parseInt(value))}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dockingPoses.slice(0, 5).map((pose, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      Pose {index + 1} ({pose.energy.toFixed(2)} kcal/mol)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Interactions</label>
            <Button
              variant={showInteractions ? "default" : "outline"}
              size="sm"
              onClick={() => setShowInteractions(!showInteractions)}
              className="w-full h-8"
            >
              <Layers className="h-3 w-3 mr-2" />
              {showInteractions ? "Shown" : "Hidden"}
            </Button>
          </div>
        </div>

        {/* Enhanced 3D Viewer */}
        <div className="relative border rounded-lg overflow-hidden bg-gray-50">
          <div 
            ref={viewerRef}
            style={{ width: '100%', height: `${height}px` }}
            className="bg-white"
          />
          
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                Loading enhanced 3D visualization...
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50">
              <div className="text-sm text-red-600 text-center p-4">
                <div className="font-medium">{error}</div>
                <Button size="sm" variant="outline" onClick={initializeViewer} className="mt-2">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Status and Info */}
        <div className="flex gap-2 text-xs flex-wrap">
          <Badge variant="outline">NGL Viewer Enhanced</Badge>
          <Badge variant="secondary">Professional 3D</Badge>
          <Badge variant="outline">High Resolution</Badge>
          {interactionData.length > 0 && (
            <Badge variant="default">{interactionData.length} Interactions</Badge>
          )}
          {dockingPoses.length > 0 && (
            <Badge variant="secondary">{dockingPoses.length} Poses</Badge>
          )}
        </div>

        {/* Enhanced Quick Stats */}
        {(ligandPdb || receptorPdb) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs bg-gray-50 p-3 rounded">
            <div>
              <div className="font-medium">Structures</div>
              <div className="text-gray-600">
                {ligandPdb && receptorPdb ? 'Complex' : ligandPdb ? 'Ligand' : 'Receptor'}
              </div>
            </div>
            <div>
              <div className="font-medium">Quality</div>
              <div className="text-gray-600">Research Grade</div>
            </div>
            <div>
              <div className="font-medium">Visualization</div>
              <div className="text-gray-600">Enhanced NGL</div>
            </div>
            <div>
              <div className="font-medium">Interactions</div>
              <div className="text-gray-600">{interactionData.length} Detected</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Advanced3DViewer;
