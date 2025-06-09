
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Download, RefreshCw, Eye } from "lucide-react";

interface Advanced3DViewerProps {
  ligandPdb?: string;
  receptorPdb?: string;
  complexPdb?: string;
  bindingAffinity?: number;
  width?: number;
  height?: number;
}

const Advanced3DViewer: React.FC<Advanced3DViewerProps> = ({
  ligandPdb,
  receptorPdb,
  complexPdb,
  bindingAffinity = 5.0,
  width = 600,
  height = 400
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState('complex');
  const [representationStyle, setRepresentationStyle] = useState('cartoon');
  const [currentComponents, setCurrentComponents] = useState<any[]>([]);

  useEffect(() => {
    initializeViewer();
  }, [ligandPdb, receptorPdb, complexPdb]);

  useEffect(() => {
    if (viewer && currentComponents.length > 0) {
      updateVisualization();
    }
  }, [viewMode, representationStyle, viewer, currentComponents]);

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

    structure.removeAllRepresentations();
    return structure;
  };

  const loadReceptorStructure = async (stage: any, receptorData: string) => {
    const receptor = await stage.loadFile(
      new Blob([receptorData], { type: 'text/plain' }),
      { ext: 'pdb', name: 'receptor' }
    );

    receptor.removeAllRepresentations();
    console.log('Receptor structure loaded successfully');
    return receptor;
  };

  const loadLigandStructure = async (stage: any, ligandData: string) => {
    const ligand = await stage.loadFile(
      new Blob([ligandData], { type: 'text/plain' }),
      { ext: 'pdb', name: 'ligand' }
    );

    ligand.removeAllRepresentations();
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
      
      component.setVisibility(shouldShow);
      
      if (shouldShow) {
        if (type === 'receptor' || (type === 'complex')) {
          addProteinRepresentation(component, type);
        }

        if (type === 'ligand' || (type === 'complex' && viewMode !== 'receptor')) {
          addLigandRepresentation(component, type);
        }
      }
    });

    setTimeout(() => {
      viewer.autoView();
    }, 100);
  };

  const addProteinRepresentation = (component: any, type: string) => {
    const proteinSelection = type === 'complex' ? 'protein' : 'all';
    const affinityColor = getAffinityBasedColor(bindingAffinity);
    
    switch (representationStyle) {
      case 'cartoon':
        component.addRepresentation('cartoon', {
          sele: proteinSelection,
          color: affinityColor.protein,
          opacity: 0.9
        });
        // Secondary structure
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
          color: affinityColor.protein,
          opacity: 0.7
        });
        break;
      case 'ribbon':
        component.addRepresentation('ribbon', {
          sele: proteinSelection,
          color: affinityColor.protein,
          opacity: 0.9
        });
        break;
      case 'backbone':
        component.addRepresentation('backbone', {
          sele: proteinSelection,
          color: affinityColor.protein,
          radiusScale: 0.5
        });
        break;
    }

    // Binding site highlighting for complex and binding_site view
    if (type === 'complex' && viewMode === 'binding_site') {
      component.addRepresentation('surface', {
        sele: 'protein and within 5 of hetero',
        color: affinityColor.bindingSite,
        opacity: 0.4
      });
    }
  };

  const addLigandRepresentation = (component: any, type: string) => {
    const ligandSelection = type === 'complex' ? 'hetero and not water' : 'all';
    const affinityColor = getAffinityBasedColor(bindingAffinity);
    
    component.addRepresentation('ball+stick', {
      sele: ligandSelection,
      color: affinityColor.ligand,
      radiusScale: 0.8
    });

    if (viewMode === 'ligand') {
      component.addRepresentation('licorice', {
        sele: ligandSelection,
        color: affinityColor.ligandSecondary,
        opacity: 0.7
      });
    }
  };

  const getAffinityBasedColor = (affinity: number) => {
    // Color scheme based on binding affinity strength
    if (affinity >= 7.0) {
      // Strong binding (nanomolar) - Deep colors
      return {
        protein: '#1E3A8A',     // Deep blue
        ligand: '#B91C1C',      // Deep red
        bindingSite: '#059669',  // Deep green
        ligandSecondary: '#7C2D12' // Deep brown
      };
    } else if (affinity >= 5.0) {
      // Moderate binding (micromolar) - Medium colors
      return {
        protein: '#3B82F6',     // Blue
        ligand: '#EF4444',      // Red
        bindingSite: '#10B981',  // Green
        ligandSecondary: '#DC2626' // Dark red
      };
    } else {
      // Weak binding (millimolar) - Light colors
      return {
        protein: '#93C5FD',     // Light blue
        ligand: '#FCA5A5',      // Light red
        bindingSite: '#6EE7B7',  // Light green
        ligandSecondary: '#F87171' // Light coral
      };
    }
  };

  const getAffinityInterpretation = (affinity: number) => {
    if (affinity >= 7.0) {
      return { strength: "Strong", range: "nanomolar", description: "High affinity binding" };
    } else if (affinity >= 5.0) {
      return { strength: "Moderate", range: "micromolar", description: "Moderate affinity binding" };
    } else {
      return { strength: "Weak", range: "millimolar", description: "Low affinity binding" };
    }
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

  const interpretation = getAffinityInterpretation(bindingAffinity);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Binding Affinity Based Color Guide */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-3">
            Binding Affinity Visualization ({bindingAffinity.toFixed(2)} pKd - {interpretation.strength} Binding)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">Current Structure Colors:</h5>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: getAffinityBasedColor(bindingAffinity).protein }}
                  ></div>
                  <span><strong>Protein Receptor:</strong> Color intensity reflects binding strength</span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: getAffinityBasedColor(bindingAffinity).ligand }}
                  ></div>
                  <span><strong>Ligand Molecule:</strong> Shows the binding compound</span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: getAffinityBasedColor(bindingAffinity).bindingSite }}
                  ></div>
                  <span><strong>Binding Site:</strong> Active binding region</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span><strong>Alpha Helices:</strong> Secondary structure elements</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span><strong>Beta Sheets:</strong> Secondary structure elements</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">Affinity Color Scale:</h5>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-800 rounded"></div>
                  <span><strong>Deep Colors:</strong> Strong binding (≥7.0 pKd, nanomolar)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span><strong>Medium Colors:</strong> Moderate binding (5.0-7.0 pKd, micromolar)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-300 rounded"></div>
                  <span><strong>Light Colors:</strong> Weak binding (&lt;5.0 pKd, millimolar)</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-300">
            <h5 className="font-medium mb-2">Binding Analysis:</h5>
            <p className="text-sm text-gray-600">
              <strong>Current Prediction:</strong> {bindingAffinity.toFixed(2)} pKd indicates {interpretation.description} 
              in the {interpretation.range} range. The visualization colors reflect this binding strength, 
              with deeper colors indicating stronger molecular interactions between the receptor and ligand.
            </p>
          </div>
        </div>

        {/* Status and Info */}
        <div className="flex gap-2 text-xs flex-wrap">
          <Badge variant="outline">NGL Viewer</Badge>
          <Badge variant="secondary">Affinity-Based Coloring</Badge>
          <Badge variant="default">Interactive 3D</Badge>
          <Badge variant={interpretation.strength === "Strong" ? "default" : interpretation.strength === "Moderate" ? "secondary" : "outline"}>
            {interpretation.strength} Binding
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default Advanced3DViewer;
