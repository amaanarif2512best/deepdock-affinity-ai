
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

      console.log('Initializing 3D Viewer with data:', { ligandPdb: !!ligandPdb, receptorPdb: !!receptorPdb, complexPdb: !!complexPdb });

      // Load NGL Viewer
      if (!(window as any).NGL) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/ngl@2.0.0-dev.38/dist/ngl.js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          setTimeout(reject, 10000);
        });
      }

      const NGL = (window as any).NGL;
      
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
        
        const stage = new NGL.Stage(viewerRef.current, {
          backgroundColor: 'white',
          quality: 'high',
          sampleLevel: 2
        });

        // Add mouse controls
        stage.mouseControls.add('scroll', 'zoom');
        stage.mouseControls.add('drag-left', 'rotate');
        stage.mouseControls.add('drag-right', 'pan');
        
        // Load structures based on available data
        if (complexPdb) {
          console.log('Loading complex structure');
          await loadComplexStructure(stage, complexPdb);
        } else if (ligandPdb && receptorPdb) {
          console.log('Loading separate ligand and receptor structures');
          await loadSeparateStructures(stage, ligandPdb, receptorPdb);
        } else if (receptorPdb) {
          console.log('Loading receptor only');
          await loadReceptorOnly(stage, receptorPdb);
        } else if (ligandPdb) {
          console.log('Loading ligand only');
          await loadLigandOnly(stage, ligandPdb);
        } else {
          throw new Error('No molecular data provided');
        }

        setViewer(stage);
        setIsLoading(false);

      }
    } catch (err) {
      console.error('3D Viewer initialization error:', err);
      setError('Failed to initialize 3D viewer');
      setIsLoading(false);
    }
  };

  const loadComplexStructure = async (stage: any, pdbData: string) => {
    try {
      const structure = await stage.loadFile(
        new Blob([pdbData], { type: 'text/plain' }),
        { ext: 'pdb', name: 'complex' }
      );

      // Protein representation
      structure.addRepresentation('cartoon', {
        sele: 'protein',
        color: 'chainname',
        opacity: 0.8
      });

      // Ligand representation
      structure.addRepresentation('ball+stick', {
        sele: 'hetero and not water',
        color: 'element',
        radiusScale: 0.8
      });

      // Binding site surface
      structure.addRepresentation('surface', {
        sele: 'protein and within 5 of hetero',
        color: 'hydrophobicity',
        opacity: 0.3
      });

      stage.autoView();
      console.log('Complex structure loaded successfully');
    } catch (error) {
      console.error('Error loading complex structure:', error);
      throw error;
    }
  };

  const loadSeparateStructures = async (stage: any, ligandData: string, receptorData: string) => {
    try {
      // Load receptor
      const receptor = await stage.loadFile(
        new Blob([receptorData], { type: 'text/plain' }),
        { ext: 'pdb', name: 'receptor' }
      );

      receptor.addRepresentation('cartoon', {
        color: 'chainname',
        opacity: 0.9
      });

      // Load ligand
      const ligand = await stage.loadFile(
        new Blob([ligandData], { type: 'text/plain' }),
        { ext: 'pdb', name: 'ligand' }
      );

      ligand.addRepresentation('ball+stick', {
        color: 'element',
        radiusScale: 0.9
      });

      // Position ligand near receptor binding site
      const bindingSite = calculateBindingSiteCenter(receptorData);
      ligand.setPosition([bindingSite.x, bindingSite.y, bindingSite.z]);

      stage.autoView();
      console.log('Separate structures loaded successfully');
    } catch (error) {
      console.error('Error loading separate structures:', error);
      throw error;
    }
  };

  const loadReceptorOnly = async (stage: any, receptorData: string) => {
    try {
      const receptor = await stage.loadFile(
        new Blob([receptorData], { type: 'text/plain' }),
        { ext: 'pdb', name: 'receptor' }
      );

      receptor.addRepresentation('cartoon', {
        color: 'chainname',
        opacity: 0.95
      });

      // Add surface representation
      receptor.addRepresentation('surface', {
        sele: 'protein',
        color: 'electrostatic',
        opacity: 0.2,
        visible: false
      });

      stage.autoView();
      console.log('Receptor structure loaded successfully');
    } catch (error) {
      console.error('Error loading receptor structure:', error);
      throw error;
    }
  };

  const loadLigandOnly = async (stage: any, ligandData: string) => {
    try {
      const ligand = await stage.loadFile(
        new Blob([ligandData], { type: 'text/plain' }),
        { ext: 'pdb', name: 'ligand' }
      );

      ligand.addRepresentation('ball+stick', {
        color: 'element',
        radiusScale: 1.0
      });

      // Add licorice representation
      ligand.addRepresentation('licorice', {
        color: 'element',
        opacity: 0.7,
        visible: false
      });

      stage.autoView();
      console.log('Ligand structure loaded successfully');
    } catch (error) {
      console.error('Error loading ligand structure:', error);
      throw error;
    }
  };

  const calculateBindingSiteCenter = (receptorData: string): {x: number, y: number, z: number} => {
    const atoms = receptorData.split('\n')
      .filter(line => line.startsWith('ATOM'))
      .map(line => ({
        x: parseFloat(line.substring(30, 38)),
        y: parseFloat(line.substring(38, 46)),
        z: parseFloat(line.substring(46, 54))
      }));

    if (atoms.length === 0) return {x: 0, y: 0, z: 0};

    const center = atoms.reduce((acc, atom) => ({
      x: acc.x + atom.x,
      y: acc.y + atom.y,
      z: acc.z + atom.z
    }), {x: 0, y: 0, z: 0});

    return {
      x: center.x / atoms.length,
      y: center.y / atoms.length,
      z: center.z / atoms.length
    };
  };

  const updateVisualization = () => {
    if (!viewer) return;

    console.log('Updating visualization with mode:', viewMode);

    viewer.eachComponent((component: any) => {
      component.removeAllRepresentations();
      
      if (component.name === 'receptor' || component.name === 'complex') {
        addProteinRepresentation(component);
      }

      if (component.name === 'ligand' || (component.name === 'complex' && ligandPdb)) {
        addLigandRepresentation(component);
      }
    });

    // Add interactions if enabled
    if (showInteractions && interactionData.length > 0) {
      addInteractionVisualization();
    }

    viewer.autoView();
  };

  const addProteinRepresentation = (component: any) => {
    const proteinSelection = component.name === 'complex' ? 'protein' : 'all';
    
    switch (representationStyle) {
      case 'cartoon':
        component.addRepresentation('cartoon', {
          sele: proteinSelection,
          color: 'chainindex',
          opacity: 0.9
        });
        break;
      case 'surface':
        component.addRepresentation('surface', {
          sele: proteinSelection,
          color: 'hydrophobicity',
          opacity: 0.7
        });
        break;
      case 'ribbon':
        component.addRepresentation('ribbon', {
          sele: proteinSelection,
          color: 'sstruc'
        });
        break;
      case 'backbone':
        component.addRepresentation('backbone', {
          sele: proteinSelection,
          color: 'residueindex'
        });
        break;
    }
  };

  const addLigandRepresentation = (component: any) => {
    const ligandSelection = component.name === 'complex' ? 'hetero and not water' : 'all';
    
    component.addRepresentation('ball+stick', {
      sele: ligandSelection,
      color: 'element',
      radiusScale: 0.8
    });

    // Add wireframe for better visibility
    component.addRepresentation('licorice', {
      sele: ligandSelection,
      color: 'element',
      opacity: 0.5,
      visible: viewMode === 'ligand'
    });
  };

  const addInteractionVisualization = () => {
    interactionData.forEach((interaction, index) => {
      if (index < 8) { // Limit to 8 interactions for clarity
        const color = getInteractionColor(interaction.type);
        
        viewer.eachComponent((component: any) => {
          try {
            // Add distance representation for interactions
            component.addRepresentation('distance', {
              atomPair: [
                [interaction.ligandAtom.replace(/[0-9]/g, '')], // Remove numbers for selection
                [interaction.proteinResidue.replace(/[0-9]/g, '')]
              ],
              color: color,
              opacity: 0.8,
              labelVisible: false
            });
          } catch (error) {
            console.warn('Could not add interaction visualization:', error);
          }
        });
      }
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

  const resetView = () => {
    if (viewer) {
      viewer.autoView();
    }
  };

  const downloadImage = () => {
    if (viewer) {
      viewer.makeImage({
        factor: 2,
        antialias: true,
        trim: true,
        transparent: false
      }).then((blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'molecular_complex_3d.png';
        link.click();
        URL.revokeObjectURL(url);
      });
    }
  };

  return (
    <Card className="border-purple-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-purple-800 flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Professional 3D Molecular Visualization
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={resetView} disabled={isLoading || !!error}>
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={downloadImage} disabled={isLoading || !!error}>
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* 3D Viewer */}
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
                Loading 3D visualization...
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

        {/* Status and Info */}
        <div className="flex gap-2 text-xs flex-wrap">
          <Badge variant="outline">NGL Viewer</Badge>
          <Badge variant="secondary">High Quality</Badge>
          {interactionData.length > 0 && (
            <Badge variant="default">{interactionData.length} Interactions</Badge>
          )}
          {(ligandPdb || receptorPdb) && (
            <Badge variant="outline">Molecular Complex</Badge>
          )}
        </div>

        {/* Quick Stats */}
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
              <div className="font-medium">Renderer</div>
              <div className="text-gray-600">NGL WebGL</div>
            </div>
            <div>
              <div className="font-medium">Interactions</div>
              <div className="text-gray-600">{interactionData.length} Found</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Advanced3DViewer;
