
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
  const [showInteractions, setShowInteractions] = useState(false);
  const [selectedPose, setSelectedPose] = useState(0);
  const [currentComponents, setCurrentComponents] = useState<any[]>([]);

  useEffect(() => {
    initializeViewer();
  }, [ligandPdb, receptorPdb, complexPdb]);

  useEffect(() => {
    if (viewer && currentComponents.length > 0) {
      updateVisualization();
    }
  }, [viewMode, representationStyle, showInteractions, selectedPose, viewer, currentComponents]);

  const initializeViewer = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Initializing 3D Viewer with data:', { 
        ligandPdb: !!ligandPdb, 
        receptorPdb: !!receptorPdb, 
        complexPdb: !!complexPdb 
      });

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
        
        const components = [];
        
        // Load structures based on available data
        if (complexPdb) {
          console.log('Loading complex structure');
          const comp = await loadComplexStructure(stage, complexPdb);
          components.push({ component: comp, type: 'complex' });
        } else {
          if (receptorPdb) {
            console.log('Loading receptor structure');
            const comp = await loadReceptorStructure(stage, receptorPdb);
            components.push({ component: comp, type: 'receptor' });
          }
          if (ligandPdb) {
            console.log('Loading ligand structure');
            const comp = await loadLigandStructure(stage, ligandPdb);
            components.push({ component: comp, type: 'ligand' });
          }
        }

        setCurrentComponents(components);
        setViewer(stage);
        setIsLoading(false);
        
        // Initial view setup
        setTimeout(() => {
          stage.autoView();
        }, 100);
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

    // Clear existing representations
    structure.removeAllRepresentations();

    // Protein representation - Blue cartoon
    structure.addRepresentation('cartoon', {
      sele: 'protein',
      color: '#4A90E2',
      opacity: 0.9
    });

    // Ligand representation - Red ball+stick
    structure.addRepresentation('ball+stick', {
      sele: 'hetero and not water',
      color: '#E74C3C',
      radiusScale: 0.8
    });

    // Binding site surface - Green
    structure.addRepresentation('surface', {
      sele: 'protein and within 5 of hetero',
      color: '#2ECC71',
      opacity: 0.3
    });

    console.log('Complex structure loaded successfully');
    return structure;
  };

  const loadReceptorStructure = async (stage: any, receptorData: string) => {
    const receptor = await stage.loadFile(
      new Blob([receptorData], { type: 'text/plain' }),
      { ext: 'pdb', name: 'receptor' }
    );

    receptor.removeAllRepresentations();
    
    // Protein cartoon - Blue
    receptor.addRepresentation('cartoon', {
      color: '#4A90E2',
      opacity: 0.9
    });

    // Secondary structure coloring
    receptor.addRepresentation('cartoon', {
      sele: 'helix',
      color: '#9B59B6',
      opacity: 0.8,
      visible: false
    });

    receptor.addRepresentation('cartoon', {
      sele: 'sheet',
      color: '#E67E22',
      opacity: 0.8,
      visible: false
    });

    console.log('Receptor structure loaded successfully');
    return receptor;
  };

  const loadLigandStructure = async (stage: any, ligandData: string) => {
    const ligand = await stage.loadFile(
      new Blob([ligandData], { type: 'text/plain' }),
      { ext: 'pdb', name: 'ligand' }
    );

    ligand.removeAllRepresentations();
    
    // Ligand ball+stick - Red
    ligand.addRepresentation('ball+stick', {
      color: '#E74C3C',
      radiusScale: 1.0
    });

    // Licorice representation for better visibility
    ligand.addRepresentation('licorice', {
      color: '#C0392B',
      opacity: 0.7,
      visible: false
    });

    console.log('Ligand structure loaded successfully');
    return ligand;
  };

  const updateVisualization = () => {
    if (!viewer || currentComponents.length === 0) return;

    console.log('Updating visualization with mode:', viewMode, 'style:', representationStyle);

    currentComponents.forEach(({ component, type }) => {
      component.removeAllRepresentations();
      
      // Apply view mode filtering
      let shouldShow = true;
      if (viewMode === 'receptor' && type === 'ligand') shouldShow = false;
      if (viewMode === 'ligand' && type === 'receptor') shouldShow = false;
      if (viewMode === 'binding_site' && type !== 'complex') shouldShow = true;
      
      component.setVisibility(shouldShow);
      
      if (shouldShow) {
        if (type === 'receptor' || (type === 'complex' && (viewMode === 'complex' || viewMode === 'receptor' || viewMode === 'binding_site'))) {
          addProteinRepresentation(component, type);
        }

        if (type === 'ligand' || (type === 'complex' && (viewMode === 'complex' || viewMode === 'ligand' || viewMode === 'binding_site'))) {
          addLigandRepresentation(component, type);
        }
      }
    });

    // Add interactions if enabled
    if (showInteractions) {
      addInteractionVisualization();
    }

    // Auto view after a short delay
    setTimeout(() => {
      viewer.autoView();
    }, 100);
  };

  const addProteinRepresentation = (component: any, type: string) => {
    const proteinSelection = type === 'complex' ? 'protein' : 'all';
    
    switch (representationStyle) {
      case 'cartoon':
        component.addRepresentation('cartoon', {
          sele: proteinSelection,
          color: '#4A90E2',
          opacity: 0.9
        });
        // Add secondary structure coloring
        component.addRepresentation('cartoon', {
          sele: proteinSelection + ' and helix',
          color: '#9B59B6',
          opacity: 0.8
        });
        component.addRepresentation('cartoon', {
          sele: proteinSelection + ' and sheet',
          color: '#E67E22',
          opacity: 0.8
        });
        break;
      case 'surface':
        component.addRepresentation('surface', {
          sele: proteinSelection,
          color: '#2ECC71',
          opacity: 0.7
        });
        break;
      case 'ribbon':
        component.addRepresentation('ribbon', {
          sele: proteinSelection,
          color: '#4A90E2'
        });
        break;
      case 'backbone':
        component.addRepresentation('backbone', {
          sele: proteinSelection,
          color: '#34495E'
        });
        break;
    }

    // Binding site highlighting for complex
    if (type === 'complex' && viewMode === 'binding_site') {
      component.addRepresentation('surface', {
        sele: 'protein and within 5 of hetero',
        color: '#F39C12',
        opacity: 0.4
      });
    }
  };

  const addLigandRepresentation = (component: any, type: string) => {
    const ligandSelection = type === 'complex' ? 'hetero and not water' : 'all';
    
    // Main ligand representation - Red
    component.addRepresentation('ball+stick', {
      sele: ligandSelection,
      color: '#E74C3C',
      radiusScale: 0.8
    });

    // Enhanced representation for ligand-only view
    if (viewMode === 'ligand') {
      component.addRepresentation('licorice', {
        sele: ligandSelection,
        color: '#C0392B',
        opacity: 0.7
      });
    }
  };

  const addInteractionVisualization = () => {
    if (!viewer || interactionData.length === 0) return;

    // Generate mock interactions for demonstration
    const mockInteractions = [
      { type: 'hydrogen_bond', distance: 2.1, residue: 'ASP123', atom: 'N1' },
      { type: 'hydrophobic', distance: 3.8, residue: 'PHE456', atom: 'C2' },
      { type: 'pi_stacking', distance: 3.5, residue: 'TRP789', atom: 'C3' }
    ];

    currentComponents.forEach(({ component, type }) => {
      if (type === 'complex') {
        // Add distance representations for interactions
        mockInteractions.forEach((interaction, index) => {
          const color = getInteractionColor(interaction.type);
          
          try {
            component.addRepresentation('contact', {
              sele: 'hetero and not water',
              sele2: 'protein',
              maxDistance: 4.0,
              color: color,
              opacity: 0.8
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
      'hydrogen_bond': '#3498DB',
      'salt_bridge': '#E74C3C',
      'pi_stacking': '#F39C12',
      'hydrophobic': '#F1C40F',
      'van_der_waals': '#95A5A6'
    };
    return colors[type as keyof typeof colors] || '#95A5A6';
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
        link.download = `molecular_complex_3d_${viewMode}_${representationStyle}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('3D structure image downloaded successfully');
      }).catch(error => {
        console.error('Failed to download image:', error);
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
                <SelectItem value="binding_site">Binding Site Focus</SelectItem>
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

        {/* Enhanced Color Guide */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-3">3D Structure Color Guide & Molecular Interactions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">Structural Elements:</h5>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-400 rounded"></div>
                  <span><strong>Protein Receptor:</strong> Blue cartoon/surface represents the target protein</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span><strong>Ligand Molecule:</strong> Red ball-and-stick shows the binding compound</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span><strong>Binding Pocket:</strong> Green surface highlights the active site</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span><strong>Alpha Helices:</strong> Purple spirals show protein secondary structure</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span><strong>Beta Sheets:</strong> Orange arrows indicate sheet structures</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">Interaction Types:</h5>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-300 rounded"></div>
                  <span><strong>Hydrogen Bonds:</strong> Blue dashes (2.5-3.5 Å)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                  <span><strong>Hydrophobic Contacts:</strong> Yellow regions (3.5-4.0 Å)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-400 rounded"></div>
                  <span><strong>π-π Stacking:</strong> Orange interactions between aromatic rings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-400 rounded"></div>
                  <span><strong>Van der Waals:</strong> Gray weak interactions (3.0-4.0 Å)</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-300">
            <h5 className="font-medium mb-2">Binding Site Analysis:</h5>
            <p className="text-sm text-gray-600">
              The 3D structure shows how the ligand (red) fits into the protein's binding pocket (green surface). 
              The binding pose indicates the optimal orientation for molecular recognition, with key interactions 
              stabilizing the complex. Use different view modes to examine specific aspects of the binding.
            </p>
          </div>
        </div>

        {/* Status and Info */}
        <div className="flex gap-2 text-xs flex-wrap">
          <Badge variant="outline">NGL Viewer</Badge>
          <Badge variant="secondary">Research Quality</Badge>
          <Badge variant="default">Interactive 3D</Badge>
          {(ligandPdb || receptorPdb) && (
            <Badge variant="outline">Molecular Complex</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Advanced3DViewer;
