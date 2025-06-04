
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

interface MoleculeViewer2DProps {
  smiles: string;
  width?: number;
  height?: number;
}

const MoleculeViewer2D: React.FC<MoleculeViewer2DProps> = ({ 
  smiles, 
  width = 300, 
  height = 200 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moleculeData, setMoleculeData] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!smiles) return;
    loadMolecule();
  }, [smiles, width, height, retryCount]);

  const loadMolecule = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Method 1: Try RDKit from CDN
      if (!(window as any).RDKit) {
        try {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/@rdkit/rdkit/dist/RDKit_minimal.js';
          document.head.appendChild(script);
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            setTimeout(reject, 10000); // 10s timeout
          });

          const RDKit = await new Promise((resolve) => {
            (window as any).initRDKitModule().then(resolve);
          });
          (window as any).RDKit = RDKit;
        } catch (e) {
          console.log('RDKit failed, trying alternative method');
          throw new Error('RDKit unavailable');
        }
      }

      const RDKit = (window as any).RDKit;
      
      // Create molecule and validate
      const mol = RDKit.get_mol(smiles);
      if (!mol || !mol.is_valid()) {
        throw new Error('Invalid SMILES structure');
      }

      // Generate optimized 2D coordinates
      const molWithCoords = RDKit.get_mol(smiles);
      RDKit.prefer_coordgen(true);
      
      // Draw to canvas with high quality
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          
          try {
            // Generate high-quality SVG
            const svg = molWithCoords.get_svg(width, height);
            const img = new Image();
            const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            
            img.onload = () => {
              ctx.clearRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              URL.revokeObjectURL(url);
            };
            
            img.onerror = () => {
              URL.revokeObjectURL(url);
              throw new Error('SVG rendering failed');
            };
            
            img.src = url;
          } catch (e) {
            throw new Error('Structure rendering failed');
          }
        }
      }

      // Calculate molecular descriptors safely
      try {
        const descriptors = mol.get_descriptors();
        setMoleculeData({
          molecularWeight: descriptors.AMW?.toFixed(2) || 'N/A',
          logP: descriptors.CrippenClogP?.toFixed(2) || 'N/A',
          hbdCount: descriptors.NumHBD || 0,
          hbaCount: descriptors.NumHBA || 0,
          tpsa: descriptors.TPSA?.toFixed(2) || 'N/A',
          rotBonds: descriptors.NumRotatableBonds || 0
        });
      } catch (e) {
        console.warn('Descriptor calculation failed:', e);
        setMoleculeData({
          molecularWeight: 'N/A',
          logP: 'N/A',
          hbdCount: 0,
          hbaCount: 0,
          tpsa: 'N/A',
          rotBonds: 0
        });
      }

      // Cleanup
      mol.delete();
      molWithCoords.delete();
      setIsLoading(false);

    } catch (err) {
      console.error('2D structure generation error:', err);
      setError('Failed to generate 2D structure');
      
      // Fallback: Use PubChem REST API for structure image
      try {
        await renderFallbackStructure();
      } catch (fallbackErr) {
        renderPlaceholder();
      }
      
      setIsLoading(false);
    }
  };

  const renderFallbackStructure = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      // Try PubChem image service
      const pubchemUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/PNG?image_size=300x200`;
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(img);
        };
        img.onerror = reject;
        img.src = pubchemUrl;
        
        // Timeout fallback
        setTimeout(reject, 5000);
      });
      
      setError(null);
    } catch (e) {
      throw new Error('Fallback rendering failed');
    }
  };

  const renderPlaceholder = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    
    // Draw molecular structure placeholder
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(10, 10, width - 20, height - 20);
    
    ctx.fillStyle = '#475569';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('2D Structure', width/2, height/2 - 10);
    ctx.fillText('Generation Failed', width/2, height/2 + 10);
    
    ctx.font = '10px Arial';
    ctx.fillStyle = '#64748b';
    ctx.fillText('SMILES: ' + smiles.substring(0, 20) + '...', width/2, height/2 + 30);
  };

  const retry = () => {
    setRetryCount(prev => prev + 1);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `molecule_2d_${smiles.substring(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    }
  };

  return (
    <Card className="border border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-blue-800">2D Structure</CardTitle>
          <div className="flex gap-2">
            {error && (
              <Button size="sm" variant="outline" onClick={retry}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={downloadImage} disabled={isLoading}>
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <canvas 
            ref={canvasRef}
            width={width}
            height={height}
            className="border rounded bg-white w-full"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                Generating structure...
              </div>
            </div>
          )}
        </div>

        {moleculeData && !error && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">MW:</span>
              <Badge variant="secondary">{moleculeData.molecularWeight} Da</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">LogP:</span>
              <Badge variant="secondary">{moleculeData.logP}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">TPSA:</span>
              <Badge variant="secondary">{moleculeData.tpsa}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">HBD:</span>
              <Badge variant="secondary">{moleculeData.hbdCount}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">HBA:</span>
              <Badge variant="secondary">{moleculeData.hbaCount}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">RB:</span>
              <Badge variant="secondary">{moleculeData.rotBonds}</Badge>
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
            <div className="font-medium">Structure generation in progress...</div>
            <div className="mt-1">Using alternative rendering method</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MoleculeViewer2D;
