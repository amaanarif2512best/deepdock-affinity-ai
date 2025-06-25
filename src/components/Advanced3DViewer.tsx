import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Download, RefreshCw, Eye, AlertCircle } from "lucide-react";

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
  const [representationStyle, setRepresentationStyle] = useState('optimal');
  const [currentComponents, setCurrentComponents] = useState<any[]>([]);
  const [processingSteps, setProcessingSteps] = useState<string[]>([]);

  useEffect(() => {
    initializeViewer();
  }, [ligandPdb, receptorPdb, complexPdb]);

  useEffect(() => {
    if (viewer && currentComponents.length > 0) {
      updateVisualization();
    }
  }, [viewMode, representationStyle, viewer, currentComponents]);

  const addProcessingStep = (step: string) => {
    console.log(`Processing: ${step}`);
    setProcessingSteps(prev => [...prev, step]);
  };

  const initializeViewer = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setProcessingSteps([]);

      addProcessingStep('Initializing NGL Viewer...');

      // Load NGL Viewer
      if (!(window as any).NGL) {
        addProcessingStep('Loading NGL library...');
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
        
        // Always merge ligand and receptor for visualization
        if (receptorPdb && ligandPdb) {
          addProcessingStep('Merging receptor and ligand PDB files...');
          const mergedPdb = createMergedComplex(receptorPdb, ligandPdb);
          const comp = await loadComplexStructure(stage, mergedPdb);
          components.push({ component: comp, type: 'complex' });
        } else if (complexPdb) {
          addProcessingStep('Loading provided complex structure...');
          const comp = await loadComplexStructure(stage, complexPdb);
          components.push({ component: comp, type: 'complex' });
        } else if (receptorPdb) {
          addProcessingStep('Loading receptor structure only...');
          const comp = await loadReceptorStructure(stage, receptorPdb);
          components.push({ component: comp, type: 'receptor' });
        } else if (ligandPdb) {
          addProcessingStep('Loading ligand structure only...');
          const comp = await loadLigandStructure(stage, ligandPdb);
          components.push({ component: comp, type: 'ligand' });
        }

        if (components.length === 0) {
          throw new Error('No molecular structures provided');
        }

        addProcessingStep('Applying 3D visualization based on binding affinity...');
        setCurrentComponents(components);
        setViewer(stage);
        setIsLoading(false);
        
        setTimeout(() => {
          stage.autoView();
          addProcessingStep('3D visualization complete!');
        }, 100);
      }
    } catch (err) {
      console.error('3D Viewer initialization error:', err);
      setError('Failed to initialize 3D viewer');
      setIsLoading(false);
    }
  };

  // Create merged complex from separate receptor and ligand files
  const createMergedComplex = (receptorData: string, ligandData: string): string => {
    addProcessingStep('Merging receptor.pdb + ligand.pdb → merged_complex.pdb');
    
    // Clean and format receptor data
    const cleanReceptor = receptorData
      .split('\n')
      .filter(line => line.startsWith('ATOM') || line.startsWith('HETATM'))
      .join('\n');
    
    // Clean and format ligand data
    const cleanLigand = ligandData
      .split('\n')
      .filter(line => line.startsWith('ATOM') || line.startsWith('HETATM'))
      .join('\n');
    
    // Merge with proper headers for 3D visualization
    const mergedComplex = `HEADER    MERGED PROTEIN-LIGAND COMPLEX FOR VISUALIZATION
REMARK   1 RECEPTOR AND LIGAND MERGED FOR 3D BINDING ANALYSIS
REMARK   2 BINDING AFFINITY: ${bindingAffinity.toFixed(2)} pKd
${cleanReceptor}
TER
${cleanLigand}
END
`;
    
    return mergedComplex;
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
    return receptor;
  };

  const loadLigandStructure = async (stage: any, ligandData: string) => {
    const ligand = await stage.loadFile(
      new Blob([ligandData], { type: 'text/plain' }),
      { ext: 'pdb', name: 'ligand' }
    );

    ligand.removeAllRepresentations();
    return ligand;
  };

  const updateVisualization = () => {
    if (!viewer || currentComponents.length === 0) return;

    console.log('Applying visualization with mode:', viewMode, 'style:', representationStyle);

    currentComponents.forEach(({ component, type }) => {
      component.removeAllRepresentations();
      
      // Apply view mode filtering
      let shouldShow = true;
      if (viewMode === 'receptor' && type === 'ligand') shouldShow = false;
      if (viewMode === 'ligand' && type === 'receptor') shouldShow = false;
      
      component.setVisibility(shouldShow);
      
      if (shouldShow) {
        if (representationStyle === 'optimal') {
          applyOptimalRepresentation(component, type);
        } else {
          applyCustomRepresentation(component, type, representationStyle);
        }
      }
    });

    setTimeout(() => {
      viewer.autoView();
    }, 100);
  };

  const applyOptimalRepresentation = (component: any, type: string) => {
    const affinityColor = getAffinityBasedColor(bindingAffinity);
    
    if (type === 'complex') {
      // Protein backbone - cartoon representation
      component.addRepresentation('cartoon', {
        sele: 'protein',
        color: affinityColor.protein,
        opacity: 0.9
      });
      
      // Ligand - ball+stick with element colors
      component.addRepresentation('ball+stick', {
        sele: 'hetero and not water',
        color: 'element',
        radiusScale: 0.8
      });
      
      // Protein surface for binding context (low opacity)
      component.addRepresentation('surface', {
        sele: 'protein',
        opacity: 0.2,
        color: affinityColor.bindingSite
      });
      
      // Highlight potential binding interactions
      component.addRepresentation('licorice', {
        sele: 'protein and within 4 of hetero',
        color: affinityColor.bindingSite,
        opacity: 0.8
      });
      
    } else if (type === 'receptor') {
      // Cartoon for protein
      component.addRepresentation('cartoon', {
        sele: 'all',
        color: affinityColor.protein,
        opacity: 0.9
      });
      
    } else if (type === 'ligand') {
      // Ball+stick for ligand with element colors
      component.addRepresentation('ball+stick', {
        sele: 'all',
        color: 'element',
        radiusScale: 0.8
      });
    }
  };

  const applyCustomRepresentation = (component: any, type: string, style: string) => {
    const affinityColor = getAffinityBasedColor(bindingAffinity);
    
    if (type === 'receptor' || type === 'complex') {
      const proteinSelection = type === 'complex' ? 'protein' : 'all';
      
      switch (style) {
        case 'cartoon':
          component.addRepresentation('cartoon', {
            sele: proteinSelection,
            color: affinityColor.protein,
            opacity: 0.9
          });
          break;
        case 'surface':
          component.addRepresentation('surface', {
            sele: proteinSelection,
            color: affinityColor.protein,
            opacity: 0.7
          });
          break;
        case 'licorice':
          component.addRepresentation('licorice', {
            sele: proteinSelection,
            color: affinityColor.protein,
            opacity: 0.9
          });
          break;
      }
    }

    if (type === 'ligand' || (type === 'complex' && viewMode !== 'receptor')) {
      const ligandSelection = type === 'complex' ? 'hetero and not water' : 'all';
      
      component.addRepresentation('ball+stick', {
        sele: ligandSelection,
        color: 'element',
        radiusScale: 0.8
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
            3D Molecular Visualization & Binding Analysis
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
        
        {/* Processing Steps Display */}
        {processingSteps.length > 0 && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              3D Visualization Process:
            </h4>
            <div className="space-y-1">
              {processingSteps.map((step, index) => (
                <div key={index} className="text-sm text-blue-700 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-200 text-xs flex items-center justify-center">
                    {index + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}
        
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
            <label className="text-sm font-medium">Representation Style</label>
            <Select value={representationStyle} onValueChange={setRepresentationStyle}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="optimal">Optimal (Recommended)</SelectItem>
                <SelectItem value="cartoon">Cartoon</SelectItem>
                <SelectItem value="surface">Surface</SelectItem>
                <SelectItem value="licorice">Licorice</SelectItem>
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

        {/* Visualization Analysis */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-3">
            3D Molecular Structure & Binding Analysis
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">Visualization Features:</h5>
              <div className="space-y-1">
                <div><strong>•</strong> Interactive 3D molecular structures</div>
                <div><strong>•</strong> Merged receptor-ligand complex view</div>
                <div><strong>•</strong> Binding affinity-based color coding</div>
                <div><strong>•</strong> Multiple representation styles</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">Current Analysis:</h5>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Protein: Cartoon/Surface representation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Ligand: Ball+stick with element colors</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Binding: Surface interactions highlighted</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-300">
            <h5 className="font-medium mb-2">Binding Analysis Results:</h5>
            <p className="text-sm text-gray-600">
              <strong>Predicted Binding Affinity:</strong> {bindingAffinity.toFixed(2)} pKd ({interpretation.description})
              <br />
              <strong>3D Visualization:</strong> Shows merged protein-ligand complex with binding affinity-based coloring and optimal representations for molecular analysis.
            </p>
          </div>
        </div>

        {/* Status and Info */}
        <div className="flex gap-2 text-xs flex-wrap">
          <Badge variant="outline">NGL Viewer</Badge>
          <Badge variant="secondary">Merged Complex</Badge>
          <Badge variant="default">3D Interactive</Badge>
          <Badge variant={interpretation.strength === "Strong" ? "default" : interpretation.strength === "Moderate" ? "secondary" : "outline"}>
            {interpretation.strength} Binding
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default Advanced3DViewer;
