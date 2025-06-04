
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
  width?: number;
  height?: number;
}

const Advanced3DViewer: React.FC<Advanced3DViewerProps> = ({
  ligandPdb,
  receptorPdb,
  complexPdb,
  interactionData = [],
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

  useEffect(() => {
    initializeViewer();
  }, [ligandPdb, receptorPdb, complexPdb]);

  useEffect(() => {
    if (viewer) {
      updateVisualization();
    }
  }, [viewMode, representationStyle, showInteractions]);

  const initializeViewer = async () => {
    try {
      setIsLoading(true);
      setError(null);

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
          quality: 'high'
        });
        
        // Load structures
        if (complexPdb) {
          await loadComplexStructure(stage, complexPdb);
        } else if (ligandPdb && receptorPdb) {
          await loadSeparateStructures(stage, ligandPdb, receptorPdb);
        } else if (receptorPdb) {
          await loadReceptorOnly(stage, receptorPdb);
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
      sele: 'hetero',
      color: 'element',
      radiusScale: 0.5
    });

    // Binding site surface
    structure.addRepresentation('surface', {
      sele: 'protein and within 5 of hetero',
      color: 'hydrophobicity',
      opacity: 0.3
    });

    stage.autoView();
  };

  const loadSeparateStructures = async (stage: any, ligandData: string, receptorData: string) => {
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
      radiusScale: 0.7
    });

    // Position ligand near receptor (simplified docking pose)
    ligand.setPosition([0, 0, -10]);

    stage.autoView();
  };

  const loadReceptorOnly = async (stage: any, receptorData: string) => {
    const receptor = await stage.loadFile(
      new Blob([receptorData], { type: 'text/plain' }),
      { ext: 'pdb', name: 'receptor' }
    );

    receptor.addRepresentation('cartoon', {
      color: 'chainname'
    });

    stage.autoView();
  };

  const updateVisualization = () => {
    if (!viewer) return;

    // Clear existing representations
    viewer.eachComponent((component: any) => {
      component.removeAllRepresentations();
    });

    // Apply new visualization based on settings
    viewer.eachComponent((component: any) => {
      if (component.name === 'receptor' || component.name.includes('protein')) {
        switch (representationStyle) {
          case 'cartoon':
            component.addRepresentation('cartoon', {
              color: 'chainname',
              opacity: 0.8
            });
            break;
          case 'surface':
            component.addRepresentation('surface', {
              color: 'hydrophobicity',
              opacity: 0.6
            });
            break;
          case 'ribbon':
            component.addRepresentation('ribbon', {
              color: 'chainname'
            });
            break;
          case 'backbone':
            component.addRepresentation('backbone', {
              color: 'chainname',
              radiusScale: 0.3
            });
            break;
        }
      }

      if (component.name === 'ligand' || component.name.includes('hetero')) {
        component.addRepresentation('ball+stick', {
          color: 'element',
          radiusScale: 0.7
        });
      }
    });

    // Add interaction visualization
    if (showInteractions && interactionData.length > 0) {
      addInteractionVisualization();
    }

    viewer.autoView();
  };

  const addInteractionVisualization = () => {
    // Add hydrogen bonds, hydrophobic contacts, etc.
    interactionData.forEach(interaction => {
      if (interaction.type === 'hydrogen_bond') {
        // Add hydrogen bond representation
        viewer.eachComponent((component: any) => {
          component.addRepresentation('distance', {
            atomPair: [
              [interaction.ligandAtom],
              [interaction.proteinResidue]
            ],
            color: 'blue',
            opacity: 0.8
          });
        });
      }
    });
  };

  const resetView = () => {
    if (viewer) {
      viewer.autoView();
    }
  };

  const downloadImage = () => {
    if (viewer) {
      viewer.makeImage({
        factor: 3,
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

  const downloadPDB = () => {
    const pdbContent = complexPdb || (receptorPdb + '\n' + (ligandPdb || ''));
    const blob = new Blob([pdbContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'molecular_complex.pdb';
    link.click();
    URL.revokeObjectURL(url);
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
            <Button size="sm" variant="outline" onClick={downloadPDB} disabled={isLoading || !!error}>
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
                <SelectItem value="complex">Complex</SelectItem>
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
          <Badge variant="secondary">Interactive 3D</Badge>
          <Badge variant="outline">High Quality</Badge>
          {interactionData.length > 0 && (
            <Badge variant="default">{interactionData.length} Interactions</Badge>
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
              <div className="text-gray-600">High Resolution</div>
            </div>
            <div>
              <div className="font-medium">Format</div>
              <div className="text-gray-600">PDB Standard</div>
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
